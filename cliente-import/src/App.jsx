import { useState, useCallback, useRef } from 'react';
import XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import './App.css';
import {
  camposDestino as camposDestinoClientes,
  camposConfiguraveis as camposConfiguraveisClientes,
  regrasMapeamento as regrasMapeamentoClientes
} from './data/campos';
import {
  camposDestinoFornecedores,
  camposConfiguraveisFornecedores,
  regrasMapeamentoFornecedores
} from './data/fornecedores';
import {
  camposDestinoProdutos,
  camposConfiguraveisProdutos,
  regrasMapeamentoProdutos,
  limitesTextoProdutos
} from './data/produtos';
import {
  limparCnpjCpf,
  normalizarCodigo,
  validarCnpjCpf,
  limparCep,
  separarTelefone,
  separarEnderecoNumero,
  mapearTipoPessoa,
  mapearTipoInscricao,
  parseData,
  mapearAtivo,
  normalizarTexto,
  detectarMapeamentoAutomatico
} from './utils/helpers';

function estoqueEstaZerado(valor) {
  const texto = String(valor ?? '').replace(/['"]/g, '').trim();
  if (!texto) return false;
  const numero = Number(texto.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numero) && numero === 0;
}

function estoqueEhMaiorQueZero(valor) {
  const texto = String(valor ?? '').replace(/['"]/g, '').trim();
  if (!texto) return false;
  const numero = Number(texto.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numero) && numero > 0;
}

function ajustarProdutoAoModelo(registro) {
  const ajustado = { ...registro };
  Object.entries(limitesTextoProdutos).forEach(([campo, limite]) => {
    // O fabricante é validado pela tabela importada. Nunca abrevie o valor,
    // pois isso pode criar um código que não existe no cadastro.
    if (campo === 'Cod Fabricante' || campo === 'Cod Linha') return;
    if (ajustado[campo] !== undefined && ajustado[campo] !== null) {
      ajustado[campo] = String(ajustado[campo]).slice(0, limite);
    }
  });
  return ajustado;
}

const limitesTextoCadastros = {
  'Nome': 60,
  'Nome Fantasia': 20,
  'Tipo de Pessoa': 1,
  'CNPJ/CPF': 14,
  'Tipo de Inscrição': 1,
  'Inscrição': 20,
  'Segmento': 4,
  'Segmento (4)': 4,
  'Cód Grupo de Cliente': 10,
  'Cód Tab Preço': 8,
  'Form De Pgto': 2,
  'Email': 80,
  'Site': 50,
  'Cód Rota': 8,
  'Agência': 8,
  'Conta': 10,
  'Conta Contábil': 15,
  'Endereco': 60,
  'Endereço': 60,
  'Bairro': 60,
  'Municipio': 60,
  'Estado': 2,
  'Numero': 15,
  'Complemento': 60,
  'DDD': 4,
  'Numero Tel': 9,
  'Telefone': 9,
  'DDD 2': 4,
  'DDD_2': 4,
  'Telefone 2': 9,
  'Numero_2': 9,
  'Nome Contato': 30,
  'Cargo': 20,
  'Email Contato': 50,
  'Cód Vendedor': 8,
  'Tipo': 1
};

function ajustarCadastroAoModelo(registro) {
  const ajustado = { ...registro };
  Object.entries(limitesTextoCadastros).forEach(([campo, limite]) => {
    if (ajustado[campo] !== undefined && ajustado[campo] !== null) {
      ajustado[campo] = String(ajustado[campo]).slice(0, limite);
    }
  });
  return ajustado;
}

function normalizarChaveFabricante(valor) {
  return normalizarTexto(valor)
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function limparAspasRegistro(registro) {
  return Object.fromEntries(
    Object.entries(registro).map(([campo, valor]) => [
      campo,
      typeof valor === 'string' ? valor.replace(/['"]/g, '') : valor
    ])
  );
}

function encontrarCodigoDesativado(porDescricao) {
  const entrada = [...porDescricao.entries()]
    .find(([descricao, codigos]) => descricao.startsWith('DESATIVAD') && codigos.length > 0);
  return entrada?.[1]?.[0] || '';
}

function resolverCodigoFabricante(valorAtual, descricaoProduto, tabela) {
  if (!tabela) return { codigo: String(valorAtual || '').trim(), status: 'sem-tabela' };

  const valor = String(valorAtual || '').trim();
  const valorNormalizado = normalizarChaveFabricante(valor);
  if (valorNormalizado.startsWith('DESATIVAD') && tabela.codigoDesativados) {
    return { codigo: tabela.codigoDesativados, status: 'convertido' };
  }
  if (valor && tabela.codigos.has(valor.toUpperCase())) {
    return { codigo: valor.toUpperCase(), status: 'codigo-existente' };
  }

  if (valorNormalizado) {
    const codigosExatos = tabela.porDescricao.get(valorNormalizado);
    if (codigosExatos?.length === 1) {
      return { codigo: codigosExatos[0], status: 'convertido' };
    }
    if (codigosExatos?.length > 1) {
      return { codigo: '', status: 'ambiguo' };
    }
  }

  const descricao = normalizarChaveFabricante(descricaoProduto);
  const correspondencias = tabela.descricoesOrdenadas
    .filter(item => descricao.includes(item.descricao));
  if (correspondencias.length === 0) {
    return { codigo: '', status: 'nao-encontrado' };
  }

  const maiorTamanho = correspondencias[0].descricao.length;
  const maisEspecificas = correspondencias.filter(item => item.descricao.length === maiorTamanho);
  const codigos = [...new Set(maisEspecificas.flatMap(item => item.codigos))];
  return codigos.length === 1
    ? { codigo: codigos[0], status: 'convertido' }
    : { codigo: '', status: 'ambiguo' };
}

function resolverCodigoLinha(valorAtual, tabela) {
  if (!tabela) return { codigo: String(valorAtual || '').trim(), status: 'sem-tabela' };

  const valor = String(valorAtual || '').trim();
  if (!valor) return { codigo: '', status: 'nao-encontrado' };

  const valorNormalizado = normalizarChaveFabricante(valor);
  if (valorNormalizado.startsWith('DESATIVAD') && tabela.codigoDesativados) {
    return { codigo: tabela.codigoDesativados, status: 'convertido' };
  }

  const codigoNormalizado = valor.toUpperCase();
  if (tabela.codigos.has(codigoNormalizado)) {
    return { codigo: codigoNormalizado, status: 'codigo-existente' };
  }

  const codigos = tabela.porDescricao.get(valorNormalizado);
  if (codigos?.length === 1) {
    return { codigo: codigos[0], status: 'convertido' };
  }
  if (!codigos && tabela.codigoDesativados) {
    return { codigo: tabela.codigoDesativados, status: 'desativado' };
  }
  return {
    codigo: '',
    status: codigos?.length > 1 ? 'ambiguo' : 'nao-encontrado'
  };
}

async function criarWorkbookModelo(nomeModelo, dados, campos) {
  const urlModelo = new URL(`templates/${nomeModelo}.xlsx`, document.baseURI);
  const resposta = await fetch(urlModelo);
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar o modelo de produtos (${resposta.status}).`);
  }

  const workbook = XLSXStyle.read(await resposta.arrayBuffer(), {
    type: 'array',
    cellStyles: true
  });
  const nomeAba = workbook.SheetNames.includes(nomeModelo)
    ? nomeModelo
    : workbook.SheetNames[0];
  const planilha = workbook.Sheets[nomeAba];

  Object.keys(planilha).forEach(referencia => {
    if (referencia.startsWith('!')) return;
    const posicao = XLSXStyle.utils.decode_cell(referencia);
    if (posicao.r > 0) delete planilha[referencia];
  });

  const camposModelo = campos.map(({ nome }) => nome);
  const camposObrigatorios = new Set(
    campos.filter(({ obrigatorio }) => obrigatorio).map(({ nome }) => nome)
  );
  camposModelo.forEach((campo, indice) => {
    const referencia = XLSXStyle.utils.encode_cell({ r: 0, c: indice });
    if (!planilha[referencia]) return;
    planilha[referencia].s = {
      ...(planilha[referencia].s || {}),
      fill: {
        patternType: 'solid',
        fgColor: { rgb: camposObrigatorios.has(campo) ? 'FFA07A' : 'FFFFFF' }
      }
    };
  });
  const dadosSemAspas = dados.map(limparAspasRegistro);
  XLSXStyle.utils.sheet_add_json(planilha, dadosSemAspas, {
    header: camposModelo,
    skipHeader: true,
    origin: 'A2'
  });
  planilha['!ref'] = XLSXStyle.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(0, dadosSemAspas.length), c: camposModelo.length - 1 }
  });

  return workbook;
}

function App() {
  const [step, setStep] = useState(0);
  const [tipoCadastro, setTipoCadastro] = useState(null);
  const [configPadrao, setConfigPadrao] = useState({});
  const [activeTab, setActiveTab] = useState('clientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [processando, setProcessando] = useState(false);
  const fileInputRef = useRef(null);
  const fabricantesInputRef = useRef(null);
  const linhasInputRef = useRef(null);
  
  // REFS PARA DADOS MASSIVOS (evita re-renders)
  const dadosOriginaisRef = useRef([]);
  const camposOrigemRef = useRef([]);
  const dadosMapeadosRef = useRef([]);
  const dadosProcessadosRef = useRef([]);
  const duplicadosRef = useRef([]);
  const fabricantesRef = useRef(null);
  const linhasRef = useRef(null);
  // O mapeamento precisa ser estado: cada alteração deve atualizar os selects e os indicadores da tela.
  const [mapeamentoAtual, setMapeamentoAtual] = useState({});
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [paginaDuplicados, setPaginaDuplicados] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(100);
  
  // PAGINAÇÃO
  
  // ESTADOS LEVES PARA UI
  const [logAlteracoes, setLogAlteracoes] = useState([]);
  const [alteracoesDetalhadas, setAlteracoesDetalhadas] = useState([]);
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const [progresso, setProgresso] = useState(0);
  const [resumoFabricantes, setResumoFabricantes] = useState(null);
  const [resumoLinhas, setResumoLinhas] = useState(null);
  const [desativarEstoqueZero, setDesativarEstoqueZero] = useState(false);

  const ehFornecedor = tipoCadastro === 'fornecedor';
  const ehProduto = tipoCadastro === 'produto';
  const camposDestino = ehProduto ? camposDestinoProdutos : ehFornecedor ? camposDestinoFornecedores : camposDestinoClientes;
  const camposConfiguraveis = ehProduto ? camposConfiguraveisProdutos : ehFornecedor ? camposConfiguraveisFornecedores : camposConfiguraveisClientes;
  const regrasMapeamento = ehProduto ? regrasMapeamentoProdutos : ehFornecedor ? regrasMapeamentoFornecedores : regrasMapeamentoClientes;
  const campoCodigo = ehProduto ? 'Cod Produto' : ehFornecedor ? 'Cód Fornec' : 'Cód Cliente';
  const campoDuplicidade = ehProduto ? 'Cod Produto' : 'CNPJ/CPF';
  const nomeCadastro = ehProduto ? 'produto' : ehFornecedor ? 'fornecedor' : 'cliente';

  const selecionarTipoCadastro = useCallback((tipo) => {
    setTipoCadastro(tipo);
    setStep(1);
  }, []);

  const voltarSelecaoTipo = useCallback(() => {
    const possuiDados = dadosOriginaisRef.current.length > 0 || dadosProcessadosRef.current.length > 0;
    if (possuiDados && !window.confirm('Ao alterar o tipo de importação, os dados atuais serão descartados. Deseja continuar?')) {
      return;
    }

    dadosOriginaisRef.current = [];
    camposOrigemRef.current = [];
    dadosMapeadosRef.current = [];
    dadosProcessadosRef.current = [];
    duplicadosRef.current = [];
    fabricantesRef.current = null;
    linhasRef.current = null;
    setResumoFabricantes(null);
    setResumoLinhas(null);
    setDesativarEstoqueZero(false);
    setTipoCadastro(null);
    setStep(0);
    setMapeamentoAtual({});
    setConfigPadrao({});
    setSearchTerm('');
    setFiltroAtivo('todos');
    setAlteracoesDetalhadas([]);
    setLogAlteracoes([]);
    setPaginaAtual(1);
    setPaginaDuplicados(1);
  }, []);

  // Upload de arquivo com processamento assíncrono para arquivos grandes
  const handleFileUpload = useCallback((file) => {
    setStep(1); // Manter na etapa 1 durante leitura
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Usar setTimeout para permitir que a UI atualize antes de processar
        setTimeout(() => {
          const jsonData = XLSX.utils
            .sheet_to_json(sheet, { defval: '' })
            .map(limparAspasRegistro);
          
          console.log(`Arquivo carregado: ${jsonData.length} linhas`);
          dadosOriginaisRef.current = jsonData;
          if (jsonData.length > 0) {
            const campos = Object.keys(jsonData[0]);
            camposOrigemRef.current = campos;
          }
          setStep(2);
        }, 50);
      } catch (error) {
        console.error('Erro ao ler arquivo:', error);
        alert('Erro ao ler o arquivo. Verifique se é uma planilha válida.');
      }
    };
    reader.onerror = () => {
      alert('Erro ao ler o arquivo.');
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
  }, []);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input para permitir re-upload do mesmo arquivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileUpload]);

  const handleFabricantesInput = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evento => {
      try {
        const workbook = XLSX.read(new Uint8Array(evento.target.result), { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        const cabecalhos = Object.keys(rows[0] || {});
        const campoDescricao = cabecalhos.find(campo => {
          const chave = normalizarChaveFabricante(campo);
          return chave === 'DESCRICAO' || chave.includes('FABRICANTE');
        });
        const campoCodigoFabricante = cabecalhos.find(campo => {
          const chave = normalizarChaveFabricante(campo);
          return chave === 'CODIGO' || chave === 'COD' || chave.includes('COD FABRICANTE');
        });

        if (!campoDescricao || !campoCodigoFabricante) {
          alert('Não foi possível identificar as colunas de descrição e código na tabela de fabricantes.');
          return;
        }

        const porDescricao = new Map();
        const codigos = new Set();
        rows.forEach(row => {
          const descricao = normalizarChaveFabricante(row[campoDescricao]);
          const codigo = String(row[campoCodigoFabricante] || '').trim().toUpperCase();
          if (!descricao || !codigo) return;
          if (!porDescricao.has(descricao)) porDescricao.set(descricao, []);
          const lista = porDescricao.get(descricao);
          if (!lista.includes(codigo)) lista.push(codigo);
          codigos.add(codigo);
        });

        fabricantesRef.current = {
          porDescricao,
          codigos,
          codigoDesativados: encontrarCodigoDesativado(porDescricao),
          descricoesOrdenadas: [...porDescricao.entries()]
            .map(([descricao, listaCodigos]) => ({ descricao, codigos: listaCodigos }))
            .sort((a, b) => b.descricao.length - a.descricao.length)
        };
        setResumoFabricantes({
          arquivo: file.name,
          fabricantes: porDescricao.size,
          ambiguos: [...porDescricao.values()].filter(lista => lista.length > 1).length
        });
      } catch (error) {
        console.error('Erro ao ler fabricantes:', error);
        alert('Não foi possível ler a tabela de fabricantes.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }, []);

  const handleLinhasInput = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evento => {
      try {
        const workbook = XLSX.read(new Uint8Array(evento.target.result), { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        const cabecalhos = Object.keys(rows[0] || {});
        const campoDescricao = cabecalhos.find(campo => {
          const chave = normalizarChaveFabricante(campo);
          return chave === 'DESCRICAO' || chave === 'NOME LINHA' || chave === 'LINHA';
        });
        const campoCodigo = cabecalhos.find(campo => {
          const chave = normalizarChaveFabricante(campo);
          return chave === 'CODIGO' || chave === 'COD' || chave === 'COD LINHA';
        });

        if (!campoDescricao || !campoCodigo) {
          alert('Não foi possível identificar as colunas de descrição e código na tabela de linhas.');
          return;
        }

        const porDescricao = new Map();
        const codigos = new Set();
        rows.forEach(row => {
          const descricao = normalizarChaveFabricante(row[campoDescricao]);
          const codigo = String(row[campoCodigo] || '').replace(/['"]/g, '').trim().toUpperCase();
          if (!descricao || !codigo) return;
          if (!porDescricao.has(descricao)) porDescricao.set(descricao, []);
          const lista = porDescricao.get(descricao);
          if (!lista.includes(codigo)) lista.push(codigo);
          codigos.add(codigo);
        });

        linhasRef.current = {
          porDescricao,
          codigos,
          codigoDesativados: encontrarCodigoDesativado(porDescricao)
        };
        setResumoLinhas({
          arquivo: file.name,
          linhas: porDescricao.size,
          ambiguos: [...porDescricao.values()].filter(lista => lista.length > 1).length
        });
      } catch (error) {
        console.error('Erro ao ler linhas:', error);
        alert('Não foi possível ler a tabela de linhas.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }, []);

  const handleClickUpload = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Mapeamento
  const handleMapeamentoChange = useCallback((campoDestino, campoOrigem) => {
    setMapeamentoAtual(prev => ({
      ...prev,
      [campoDestino]: campoOrigem
    }));
  }, []);

  const mapearAutomaticamente = useCallback(() => {
    const novoMapeamento = {};
    camposDestino.forEach(campo => {
      const origemDetectada = detectarMapeamentoAutomatico(campo.nome, camposOrigemRef.current, regrasMapeamento);
      if (origemDetectada) {
        novoMapeamento[campo.nome] = origemDetectada;
      }
    });
    setMapeamentoAtual(novoMapeamento);
  }, [camposDestino, regrasMapeamento]);

  const resetarMapeamento = useCallback(() => {
    setMapeamentoAtual({});
  }, []);

  const aplicarMapeamento = useCallback(() => {
    if (processando) return;

    if (!mapeamentoAtual[campoCodigo]) {
      alert(`Mapeie o campo obrigatório "${campoCodigo}" antes de continuar. Sem ele não é possível identificar os registros.`);
      return;
    }
    if (!ehProduto && !mapeamentoAtual['CNPJ/CPF']) {
      alert('Mapeie o campo obrigatório "CNPJ/CPF" antes de continuar. Esse valor deve ser individual para cada cadastro.');
      return;
    }

    const obrigatoriosNaoMapeados = camposDestino.filter(
      c => c.obrigatorio && !mapeamentoAtual[c.nome]
    );

    if (obrigatoriosNaoMapeados.length > 0) {
      const continuar = window.confirm(
        `Existem ${obrigatoriosNaoMapeados.length} campos obrigatórios não mapeados. Deseja continuar mesmo assim?\n\nCampos não mapeados ficarão vazios e poderão ser preenchidos com valores padrão na próxima etapa.`
      );
      if (!continuar) return;
    }

    // Mapeia apenas os campos que foram explicitamente selecionados
    // Campos não mapeados permanecem sem valor para serem preenchidos com defaults depois
    const dadosOriginais = dadosOriginaisRef.current;
    const dadosMapeadosNovo = new Array(dadosOriginais.length);
    const mapearLinha = row => {
      const newRow = {};
      camposDestino.forEach(campo => {
        const campoOrigem = mapeamentoAtual[campo.nome];
        // Apenas copia se houver mapeamento explícito
        if (campoOrigem && row[campoOrigem] !== undefined && row[campoOrigem] !== null) {
          newRow[campo.nome] = row[campoOrigem];
        }
        // Se não mapeado, o campo fica undefined (será tratado com defaults na etapa 4)
      });
      return newRow;
    };

    const tamanhoLote = 500;
    let indiceAtual = 0;
    setProcessando(true);
    setProgresso(0);

    const mapearLote = () => {
      const fim = Math.min(indiceAtual + tamanhoLote, dadosOriginais.length);
      for (let i = indiceAtual; i < fim; i++) {
        dadosMapeadosNovo[i] = mapearLinha(dadosOriginais[i]);
      }

      indiceAtual = fim;
      setProgresso(dadosOriginais.length ? Math.round((indiceAtual / dadosOriginais.length) * 100) : 100);

      if (indiceAtual < dadosOriginais.length) {
        setTimeout(mapearLote, 0);
        return;
      }

      dadosMapeadosRef.current = dadosMapeadosNovo;
      setProcessando(false);
      setStep(3);
    };

    requestAnimationFrame(mapearLote);
  }, [campoCodigo, camposDestino, ehProduto, mapeamentoAtual, processando]);

  const voltarMapeamento = useCallback(() => {
    setStep(2);
  }, []);

  // Processamento
  const processarDados = useCallback(() => {
    setStep(4);
  }, []);

  const handleConfigPadraoChange = useCallback((campo, valor) => {
    setConfigPadrao(prev => ({
      ...prev,
      [campo]: valor
    }));
  }, []);

  const processarPlanilha = useCallback(() => {
    if (
      ehProduto &&
      desativarEstoqueZero &&
      dadosOriginaisRef.current.length > 0 &&
      !Object.prototype.hasOwnProperty.call(dadosOriginaisRef.current[0], 'ESTQ')
    ) {
      alert('A regra ESTQ 0 → DESATIVADOS foi marcada, mas a coluna ESTQ não existe na planilha importada.');
      return;
    }

    const aplicarDesativacaoPorEstoque =
      ehProduto &&
      desativarEstoqueZero &&
      dadosOriginaisRef.current.some(row => estoqueEstaZerado(row['ESTQ']));

    if (
      aplicarDesativacaoPorEstoque &&
      (!fabricantesRef.current?.codigoDesativados || !linhasRef.current?.codigoDesativados)
    ) {
      alert(
        'Para esta planilha, importe as tabelas de fabricantes e linhas contendo a descrição DESATIVADOS antes de processar.'
      );
      return;
    }

    const obrigatoriosSemValorPadrao = camposDestino.filter(({ nome, obrigatorio }) => {
      if (
        !obrigatorio ||
        nome === campoCodigo ||
        nome === 'CNPJ/CPF' ||
        (nome === 'Cod Fabricante' && fabricantesRef.current) ||
        (nome === 'Cod Linha' && linhasRef.current) ||
        mapeamentoAtual[nome]
      ) return false;
      return String(configPadrao[nome] ?? '').trim() === '';
    });

    if (obrigatoriosSemValorPadrao.length > 0) {
      alert(
        `Preencha os campos obrigatórios não mapeados antes de continuar:\n\n` +
        obrigatoriosSemValorPadrao.map(({ nome }) => `• ${nome}`).join('\n')
      );
      return;
    }

    setProcessando(true);
    setProgresso(0);
    
    // Usar setTimeout para garantir que a UI atualize antes de começar
    setTimeout(() => {
      // Processamento em chunks assíncronos para não travar o navegador
      const dadosParaProcessar = dadosMapeadosRef.current;
      const total = dadosParaProcessar.length;
      const chunkSize = 1000; // Aumentado para 1000 registros por vez (mais eficiente)
      let currentIndex = 0;
      const dadosProcessadosNovo = [];
      let fabricantesConvertidos = 0;
      let fabricantesNaoEncontrados = 0;
      let fabricantesAmbiguos = 0;
      let linhasConvertidas = 0;
      let linhasNaoEncontradas = 0;
      let linhasAmbiguas = 0;
      let linhasMarcadasDesativadas = 0;
      let produtosDesativadosPorEstoque = 0;
      let produtosDesativadosComEstoquePositivo = 0;
      
      const processChunk = () => {
        const chunkEnd = Math.min(currentIndex + chunkSize, total);
        
        // Filtrar e processar chunk atual
        for (let i = currentIndex; i < chunkEnd; i++) {
          const row = dadosParaProcessar[i];
          const rowOriginal = dadosOriginaisRef.current[i] || {};
          const codigo = normalizarCodigo(row[campoCodigo]);
          
          if (codigo === '') continue;
          
          const tel1 = separarTelefone(row['Numero Tel'] || row['DDD'] || '');
          const tel2 = separarTelefone(row['Numero_2'] || row['DDD_2'] || '');

          let registro = {
            'Cód Cliente': codigo,
            'Nome': normalizarTexto(row['Nome']) || configPadrao['Nome'] || '',
            'Nome Fantasia': normalizarTexto(row['Nome Fantasia']) || configPadrao['Nome Fantasia'] || '',
            'Tipo de Pessoa': mapearTipoPessoa(row['Tipo de Pessoa']) || configPadrao['Tipo de Pessoa'] || 'F',
            'CNPJ/CPF': limparCnpjCpf(row['CNPJ/CPF'], mapearTipoPessoa(row['Tipo de Pessoa'])),
            'Tipo de Inscrição': row['Tipo de Inscrição'] || configPadrao['Tipo de Inscrição'] || mapearTipoInscricao(row),
            'Inscrição': row['Inscrição'] || '',
            'Segmento': row['Segmento'] || configPadrao['Segmento'] || 'CL',
            'Cód Grupo de Cliente': row['Cód Grupo de Cliente'] || configPadrao['Cód Grupo de Cliente'] || '',
            'Data de Cadastro': parseData(row['Data de Cadastro'] || configPadrao['Data de Cadastro']) || parseData(new Date()) || '01/01/2024',
            'Data da 1ª compra': parseData(row['Data da 1ª compra']) || '',
            'Data Ult Compra': parseData(row['Data Ult Compra']) || '',
            'Limite de Crédito': row['Limite de Crédito'] || '',
            'Cód Tab Preço': row['Cód Tab Preço'] || configPadrao['Cód Tab Preço'] || 'PADRAO',
            'Form De Pgto': row['Form De Pgto'] || configPadrao['Form De Pgto'] || 'DP',
            'Condição De Pgto': row['Condição De Pgto'] || configPadrao['Condição De Pgto'] || '1',
            'Email': row['Email'] || '',
            'Site': row['Site'] || '',
            'Cód Rota': row['Cód Rota'] || configPadrao['Cód Rota'] || '',
            'Banco': row['Banco'] || configPadrao['Banco'] || '',
            'Agência': row['Agência'] || configPadrao['Agência'] || '',
            'Conta': row['Conta'] || configPadrao['Conta'] || '',
            'Cód Tipo tributação': row['Cód Tipo tributação'] || configPadrao['Cód Tipo tributação'] || '1',
            'Endereco': row['Endereco'] || configPadrao['Endereco'] || '',
            'Bairro': row['Bairro'] || configPadrao['Bairro'] || '',
            'Municipio': row['Municipio'] || configPadrao['Municipio'] || '',
            'Cep': limparCep(row['Cep'] || configPadrao['Cep']),
            'Estado': row['Estado'] || configPadrao['Estado'] || '',
            'Numero': row['Numero'] || configPadrao['Numero'] || '',
            'Complemento': row['Complemento'] || '',
            'DDD': tel1.ddd,
            'Numero Tel': tel1.numero,
            'Nome Contato': row['Nome Contato'] || '',
            'Cargo': row['Cargo'] || configPadrao['Cargo'] || '',
            'Email Contato': row['Email Contato'] || '',
            'DDD_2': tel2.ddd,
            'Numero_2': tel2.numero,
            'Cód Vendedor': row['Cód Vendedor'] || configPadrao['Cód Vendedor'] || 'PATRICKK',
            'Ativo': row['Ativo'] !== undefined
              ? mapearAtivo(row['Ativo'])
              : configPadrao['Ativo'] !== undefined ? mapearAtivo(configPadrao['Ativo']) : ''
          };

          if (ehFornecedor) {
            const telefone = separarTelefone(row['Telefone'] || '');
            const telefone2 = separarTelefone(row['Telefone 2'] || '');

            registro = {
              'Cód Fornec': codigo,
              'Tipo': row['Tipo'] || configPadrao['Tipo'] || '',
              'Segmento (4)': row['Segmento (4)'] || configPadrao['Segmento (4)'] || '',
              'Nome': normalizarTexto(row['Nome'] || configPadrao['Nome']),
              'Nome Fantasia': normalizarTexto(row['Nome Fantasia']),
              'Tipo de Pessoa': mapearTipoPessoa(row['Tipo de Pessoa']) || configPadrao['Tipo de Pessoa'] || '',
              'CNPJ/CPF': limparCnpjCpf(row['CNPJ/CPF'], mapearTipoPessoa(row['Tipo de Pessoa'])),
              'Tipo de Inscrição': row['Tipo de Inscrição'] || configPadrao['Tipo de Inscrição'] || mapearTipoInscricao(row),
              'Inscrição': row['Inscrição'] || '',
              'Conta Contábil': row['Conta Contábil'] || configPadrao['Conta Contábil'] || '',
              'Data de Cadastro': parseData(row['Data de Cadastro'] || configPadrao['Data de Cadastro']),
              'Email': row['Email'] || '',
              'Endereço': row['Endereço'] || configPadrao['Endereço'] || '',
              'Bairro': row['Bairro'] || configPadrao['Bairro'] || '',
              'Municipio': row['Municipio'] || configPadrao['Municipio'] || '',
              'Cep': limparCep(row['Cep'] || configPadrao['Cep']),
              'Estado': row['Estado'] || configPadrao['Estado'] || '',
              'Numero': row['Numero'] || configPadrao['Numero'] || '',
              'Complemento': row['Complemento'] || '',
              'DDD': row['DDD'] || telefone.ddd,
              'Telefone': telefone.numero || row['Telefone'] || '',
              'DDD 2': row['DDD 2'] || telefone2.ddd,
              'Telefone 2': telefone2.numero || row['Telefone 2'] || '',
              'Nome Contato': row['Nome Contato'] || '',
              'Site': row['Site'] || '',
              'Cargo': row['Cargo'] || configPadrao['Cargo'] || '',
              'Email Contato': row['Email Contato'] || '',
              'Ativo': row['Ativo'] !== undefined
                ? mapearAtivo(row['Ativo'])
                : configPadrao['Ativo'] !== undefined ? mapearAtivo(configPadrao['Ativo']) : ''
            };
          }

          if (ehProduto) {
            registro = Object.fromEntries(
              camposDestinoProdutos.map(({ nome }) => [nome, row[nome] || configPadrao[nome] || ''])
            );
            registro['Cod Produto'] = codigo;
            registro['Descrição'] = normalizarTexto(row['Descrição'] || configPadrao['Descrição']);
            registro['Desc Resumida'] = normalizarTexto(row['Desc Resumida'] || configPadrao['Desc Resumida']);
            registro['Data Cadastro'] = parseData(row['Data Cadastro'] || configPadrao['Data Cadastro']);
            registro['Ativo'] = row['Ativo'] !== undefined
              ? mapearAtivo(row['Ativo'])
              : configPadrao['Ativo'] !== undefined ? mapearAtivo(configPadrao['Ativo']) : '';
            registro = ajustarProdutoAoModelo(registro);
          }

          // Valores automáticos não devem preencher campos que não vieram do arquivo
          // nem receberam um valor informado manualmente na etapa de configuração.
          camposDestino.forEach(({ nome }) => {
            const valorMapeado = row[nome];
            const valorManual = configPadrao[nome];
            const possuiValorMapeado = valorMapeado !== undefined && valorMapeado !== null && valorMapeado !== '';
            const possuiValorManual = valorManual !== undefined && valorManual !== null && valorManual !== '';

            if (!possuiValorMapeado && !possuiValorManual) {
              registro[nome] = '';
            }
          });

          if (ehProduto && fabricantesRef.current) {
            const resultadoFabricante = resolverCodigoFabricante(
              row['Cod Fabricante'],
              row['Descrição'],
              fabricantesRef.current
            );
            registro['Cod Fabricante'] = resultadoFabricante.codigo;
            if (resultadoFabricante.status === 'convertido') fabricantesConvertidos++;
            if (resultadoFabricante.status === 'nao-encontrado') fabricantesNaoEncontrados++;
            if (resultadoFabricante.status === 'ambiguo') fabricantesAmbiguos++;
          }
          if (ehProduto && !fabricantesRef.current) {
            const fabricanteInformado = String(row['Cod Fabricante'] || configPadrao['Cod Fabricante'] || '').trim();
            if (fabricanteInformado && !/^[A-Z0-9]{1,6}$/i.test(fabricanteInformado)) {
              registro['Cod Fabricante'] = '';
            }
          }
          if (ehProduto && linhasRef.current) {
            const resultadoLinha = resolverCodigoLinha(row['Cod Linha'], linhasRef.current);
            registro['Cod Linha'] = resultadoLinha.codigo;
            if (resultadoLinha.status === 'convertido') linhasConvertidas++;
            if (resultadoLinha.status === 'nao-encontrado') linhasNaoEncontradas++;
            if (resultadoLinha.status === 'ambiguo') linhasAmbiguas++;
            if (resultadoLinha.status === 'desativado') linhasMarcadasDesativadas++;
          }
          if (aplicarDesativacaoPorEstoque && estoqueEstaZerado(rowOriginal['ESTQ'])) {
            registro['Cod Fabricante'] = fabricantesRef.current.codigoDesativados;
            registro['Cod Linha'] = linhasRef.current.codigoDesativados;
            produtosDesativadosPorEstoque++;
          } else if (estoqueEhMaiorQueZero(rowOriginal['ESTQ'])) {
            let possuiCodigoDesativado = false;
            if (
              fabricantesRef.current?.codigoDesativados &&
              String(registro['Cod Fabricante'] || '').trim().toUpperCase() ===
                String(fabricantesRef.current.codigoDesativados).trim().toUpperCase()
            ) {
              const codigoOriginal = registro['Cod Fabricante'];
              registro.__observacaoFabricante = true;
              registro['Cod Fabricante'] =
                `ESTQ ${rowOriginal['ESTQ']} - Fabricante DESATIVADO com estoque maior que zero (código original: ${codigoOriginal})`;
              possuiCodigoDesativado = true;
            }
            if (
              linhasRef.current?.codigoDesativados &&
              String(registro['Cod Linha'] || '').trim().toUpperCase() ===
                String(linhasRef.current.codigoDesativados).trim().toUpperCase()
            ) {
              const codigoOriginal = registro['Cod Linha'];
              registro.__observacaoLinha = true;
              registro['Cod Linha'] =
                `ESTQ ${rowOriginal['ESTQ']} - Linha DESATIVADA com estoque maior que zero (código original: ${codigoOriginal})`;
              possuiCodigoDesativado = true;
            }
            if (possuiCodigoDesativado) produtosDesativadosComEstoquePositivo++;
          }

          if (!ehProduto) {
            const tipoInscricaoVazio = String(registro['Tipo de Inscrição'] || '').trim() === '';
            const inscricaoVazia = String(registro['Inscrição'] || '').trim() === '';
            if (tipoInscricaoVazio && inscricaoVazia) {
              registro['Tipo de Inscrição'] = 'I';
              registro['Inscrição'] = 'ISENTO';
            }

            const telefonePrincipal = separarTelefone(
              ehFornecedor ? row['Telefone'] : row['Numero Tel'],
              row['DDD']
            );
            const telefoneSecundario = separarTelefone(
              ehFornecedor ? row['Telefone 2'] : row['Numero_2'],
              ehFornecedor ? row['DDD 2'] : row['DDD_2']
            );

            registro['DDD'] = telefonePrincipal.ddd;
            registro[ehFornecedor ? 'Telefone' : 'Numero Tel'] = telefonePrincipal.numero;
            registro[ehFornecedor ? 'DDD 2' : 'DDD_2'] = telefoneSecundario.ddd;
            registro[ehFornecedor ? 'Telefone 2' : 'Numero_2'] = telefoneSecundario.numero;

            const campoEndereco = ehFornecedor ? 'Endereço' : 'Endereco';
            const enderecoSeparado = separarEnderecoNumero(registro[campoEndereco], registro['Numero']);
            registro[campoEndereco] = enderecoSeparado.endereco;
            registro['Numero'] = enderecoSeparado.numero;
            registro = ajustarCadastroAoModelo(registro);
          }

          dadosProcessadosNovo.push(registro);
        }
        
        currentIndex = chunkEnd;
        setProgresso(Math.round((currentIndex / total) * 100));
        
        // Verifica tempo de processamento do chunk
        
        if (currentIndex < total) {
          // Sempre usa setTimeout para dar controle ao event loop
          setTimeout(processChunk, 0);
        } else {
          // Finalização: ordenar e remover duplicatas (CNPJ igual mantém menor código)
          const ordenados = [...dadosProcessadosNovo].sort((a, b) => {
            const ca = String(a[campoCodigo] || '').padStart(10, '0');
            const cb = String(b[campoCodigo] || '').padStart(10, '0');
            return ca.localeCompare(cb);
          });

          const vistos = new Map();
          const unicos = [];
          const listaDuplicados = [];

          for (let i = 0; i < ordenados.length; i++) {
            const row = ordenados[i];
            const chave = ehProduto
              ? String(row[campoDuplicidade] || '').trim()
              : limparCnpjCpf(row['CNPJ/CPF']);
            
            if (!vistos.has(chave)) {
              // Primeiro registro com este CNPJ (menor código pois está ordenado)
              vistos.set(chave, row[campoCodigo]);
              unicos.push(row);
            } else {
              // Duplicado - armazena info do duplicado
              listaDuplicados.push({
                ...row,
                _motivo: 'CNPJ',
                _codigoMantido: vistos.get(chave)
              });
            }
          }

          if (unicos.length === 0) {
            setProcessando(false);
            setStep(2);
            alert(`Nenhum ${nomeCadastro} válido foi encontrado. Verifique o mapeamento do campo "${campoCodigo}" e se a planilha possui valores nesse campo.`);
            return;
          }

          dadosProcessadosRef.current = unicos;
          duplicadosRef.current = listaDuplicados;
          setPaginaAtual(1);
          setPaginaDuplicados(1);
          setStep(5);
          setProcessando(false);
          
          const novaAlteracao = {
            timestamp: new Date().toISOString(),
            mensagem: `Processamento concluído: ${unicos.length} registros válidos, ${listaDuplicados.length} duplicados removidos`,
            tipo: 'success'
          };
          setLogAlteracoes(prev => [...prev, novaAlteracao]);
          
          if (listaDuplicados.length > 0) {
            setLogAlteracoes(prev => [...prev, {
              timestamp: new Date().toISOString(),
              mensagem: `${listaDuplicados.length} clientes duplicados por CNPJ movidos para aba "Duplicados"`,
              tipo: 'warning'
            }]);
          }

          if (ehProduto && fabricantesRef.current) {
            setLogAlteracoes(prev => [...prev, {
              timestamp: new Date().toISOString(),
              mensagem: `De/para de fabricantes: ${fabricantesConvertidos} convertidos, ${fabricantesNaoEncontrados} não encontrados e ${fabricantesAmbiguos} ambíguos`,
              tipo: fabricantesNaoEncontrados || fabricantesAmbiguos ? 'warning' : 'success'
            }]);
          }
          if (ehProduto && linhasRef.current) {
            setLogAlteracoes(prev => [...prev, {
              timestamp: new Date().toISOString(),
              mensagem: `De/para de linhas: ${linhasConvertidas} convertidas, ${linhasMarcadasDesativadas} marcadas como DESATIVADOS, ${linhasNaoEncontradas} não encontradas e ${linhasAmbiguas} ambíguas`,
              tipo: linhasNaoEncontradas || linhasAmbiguas ? 'warning' : 'success'
            }]);
          }
          if (aplicarDesativacaoPorEstoque) {
            setLogAlteracoes(prev => [...prev, {
              timestamp: new Date().toISOString(),
              mensagem: `${produtosDesativadosPorEstoque} produto(s) com ESTQ igual a 0 enviados automaticamente para fabricante e linha DESATIVADOS`,
              tipo: 'success'
            }]);
          }
          if (produtosDesativadosComEstoquePositivo > 0) {
            setLogAlteracoes(prev => [...prev, {
              timestamp: new Date().toISOString(),
              mensagem: `${produtosDesativadosComEstoquePositivo} produto(s) com ESTQ maior que zero mantiveram código DESATIVADO e receberam observação na exportação`,
              tipo: 'warning'
            }]);
          }
        }
      };
      
      // Inicia processamento após renderização
      requestAnimationFrame(processChunk);
    }, 100);
  }, [campoCodigo, campoDuplicidade, camposDestino, configPadrao, desativarEstoqueZero, ehFornecedor, ehProduto, mapeamentoAtual, nomeCadastro]);

  // Atualização de campos
  const atualizarCampo = useCallback((idx, campo, valor) => {
      const novosDados = [...dadosProcessadosRef.current];
      const valorAnterior = novosDados[idx][campo];
      const limite = ehProduto && (campo === 'Cod Fabricante' || campo === 'Cod Linha')
        ? undefined
        : ehProduto ? limitesTextoProdutos[campo] : limitesTextoCadastros[campo];
      const valorAjustado = limite
        ? String(valor ?? '').slice(0, limite)
        : valor;
      
      if (valorAnterior !== valorAjustado) {
        novosDados[idx] = { ...novosDados[idx], [campo]: valorAjustado };
        
        setAlteracoesDetalhadas(prevAlt => {
          const novaAlteracao = {
            idx,
            campo,
            valorAnterior,
            novoValor: valorAjustado,
            timestamp: new Date().toISOString()
          };
          return [...prevAlt, novaAlteracao];
        });

        setLogAlteracoes(prevLog => [
          ...prevLog,
          {
            timestamp: new Date().toISOString(),
            mensagem: `Campo "${campo}" alterado de "${valorAnterior}" para "${valorAjustado}"`,
            tipo: 'info'
          }
        ]);
      }
      
      dadosProcessadosRef.current = novosDados;
  }, [ehProduto]);

  // Exportação
  const exportarExcel = useCallback(async () => {
    const documentosExportados = new Set();
    const codigosExportados = new Set();
    const dadosNormalizados = ehProduto
      ? dadosProcessadosRef.current.map(registro => {
          const fabricante = registro.__observacaoFabricante
            ? { codigo: registro['Cod Fabricante'] }
            : resolverCodigoFabricante(
                registro['Cod Fabricante'],
                registro['Descrição'],
                fabricantesRef.current
              );
          return ajustarProdutoAoModelo({
            ...registro,
            'Cod Linha': registro.__observacaoLinha
              ? registro['Cod Linha']
              : resolverCodigoLinha(
                  registro['Cod Linha'],
                  linhasRef.current
                ).codigo,
            'Cod Fabricante': fabricante.codigo
          });
        })
      : dadosProcessadosRef.current.map(registro => ({
          ...ajustarCadastroAoModelo(registro),
          [campoCodigo]: normalizarCodigo(registro[campoCodigo]),
          'CNPJ/CPF': limparCnpjCpf(registro['CNPJ/CPF'], registro['Tipo de Pessoa'])
        }));
    const dadosParaExportar = ehProduto
      ? dadosNormalizados
      : dadosNormalizados.filter(registro => {
          const documento = registro['CNPJ/CPF'];
          const codigoOriginal = String(registro[campoCodigo] ?? '').trim();
          const codigo = /^\d+$/.test(codigoOriginal)
            ? codigoOriginal.replace(/^0+(?=\d)/, '')
            : codigoOriginal.toUpperCase();

          if (
            !codigo ||
            !validarCnpjCpf(documento) ||
            codigosExportados.has(codigo) ||
            documentosExportados.has(documento)
          ) {
            return false;
          }
          codigosExportados.add(codigo);
          documentosExportados.add(documento);
          return true;
        });

    if (dadosParaExportar.length === 0) {
      alert(`Nenhum ${nomeCadastro} com CPF/CNPJ válido e não duplicado está disponível para exportação.`);
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const nomeModelo = ehProduto ? 'PRODUTOS' : ehFornecedor ? 'FORNECEDORES' : 'CLIENTES';
    try {
      const wbModelo = await criarWorkbookModelo(nomeModelo, dadosParaExportar, camposDestino);
      XLSXStyle.writeFile(wbModelo, `${nomeModelo}_IMPORT_${timestamp}.xlsx`, { bookType: 'xlsx' });
    } catch (error) {
      console.error(`Erro ao gerar planilha de ${nomeCadastro}s:`, error);
      alert(`Não foi possível gerar a planilha de ${nomeCadastro}s com o modelo de cabeçalhos.`);
    }
  }, [campoCodigo, camposDestino, ehFornecedor, ehProduto, nomeCadastro]);

  const exportarApenasAlteracoes = useCallback(async () => {
    const indicesAlterados = [...new Set(alteracoesDetalhadas.map(a => a.idx))];
    const documentosExportados = new Set();
    const codigosExportados = new Set();
    const dadosAlterados = indicesAlterados
      .map(idx => dadosProcessadosRef.current[idx])
      .map(registro => ehProduto
        ? ajustarProdutoAoModelo({
            ...registro,
            'Cod Linha': registro.__observacaoLinha
              ? registro['Cod Linha']
              : resolverCodigoLinha(
                  registro['Cod Linha'],
                  linhasRef.current
                ).codigo,
            'Cod Fabricante': registro.__observacaoFabricante
              ? registro['Cod Fabricante']
              : resolverCodigoFabricante(
                  registro['Cod Fabricante'],
                  registro['Descrição'],
                  fabricantesRef.current
                ).codigo
          })
        : {
            ...ajustarCadastroAoModelo(registro),
            [campoCodigo]: normalizarCodigo(registro[campoCodigo]),
            'CNPJ/CPF': limparCnpjCpf(registro['CNPJ/CPF'], registro['Tipo de Pessoa'])
          })
      .filter(registro => {
        if (ehProduto) return true;
        const documento = registro['CNPJ/CPF'];
        const codigoOriginal = String(registro[campoCodigo] ?? '').trim();
        const codigo = /^\d+$/.test(codigoOriginal)
          ? codigoOriginal.replace(/^0+(?=\d)/, '')
          : codigoOriginal.toUpperCase();

        if (
          !codigo ||
          !validarCnpjCpf(documento) ||
          codigosExportados.has(codigo) ||
          documentosExportados.has(documento)
        ) return false;

        codigosExportados.add(codigo);
        documentosExportados.add(documento);
        return true;
      });

    if (dadosAlterados.length === 0) {
      alert('Nenhum cadastro alterado com CPF/CNPJ válido e não duplicado está disponível para exportação.');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const nomeModelo = ehProduto ? 'PRODUTOS' : ehFornecedor ? 'FORNECEDORES' : 'CLIENTES';
    try {
      const wbModelo = await criarWorkbookModelo(nomeModelo, dadosAlterados, camposDestino);
      XLSXStyle.writeFile(wbModelo, `${nomeModelo}_SOMENTE_ALTERADOS_${timestamp}.xlsx`, { bookType: 'xlsx' });
    } catch (error) {
      console.error(`Erro ao gerar planilha de ${nomeCadastro}s alterados:`, error);
      alert(`Não foi possível gerar a planilha de ${nomeCadastro}s com o modelo de cabeçalhos.`);
    }
  }, [alteracoesDetalhadas, campoCodigo, camposDestino, ehFornecedor, ehProduto, nomeCadastro]);

  const exportarDuplicados = useCallback(() => {
    if (duplicadosRef.current.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(duplicadosRef.current);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Duplicados');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    XLSX.writeFile(wb, `${ehProduto ? 'PRODUTOS' : ehFornecedor ? 'FORNECEDORES' : 'CLIENTES'}_DUPLICADOS_${timestamp}.xls`, { bookType: 'biff8' });
  }, [ehFornecedor, ehProduto]);

  const descartarAlteracoes = useCallback(() => {
    if (window.confirm('Deseja realmente descartar todas as alterações feitas?')) {
      setAlteracoesDetalhadas([]);
      setLogAlteracoes([]);
    }
  }, []);

  const resetar = useCallback(() => {
    if (window.confirm('Deseja realmente resetar todo o processo?')) {
      setStep(0);
      setTipoCadastro(null);
      setPaginaAtual(1);
      setPaginaDuplicados(1);
      dadosOriginaisRef.current = [];
      camposOrigemRef.current = [];
      dadosMapeadosRef.current = [];
      dadosProcessadosRef.current = [];
      duplicadosRef.current = [];
      fabricantesRef.current = null;
      linhasRef.current = null;
      setResumoFabricantes(null);
      setResumoLinhas(null);
      setDesativarEstoqueZero(false);
      setMapeamentoAtual({});
      setConfigPadrao({});
      setAlteracoesDetalhadas([]);
      setLogAlteracoes([]);
    }
  }, []);

  // Estatísticas
  const estatisticas = dadosProcessadosRef.current.length > 0 ? {
    total: dadosProcessadosRef.current.length,
    ativos: dadosProcessadosRef.current.filter(r => r['Ativo'] === 1).length,
    inativos: dadosProcessadosRef.current.filter(r => r['Ativo'] === 0).length,
    semCnpj: dadosProcessadosRef.current.filter(r => !r['CNPJ/CPF']).length,
    linhasAlteradas: new Set(alteracoesDetalhadas.map(a => a.idx)).size
  } : null;

  // Filtros
  const indicesAlterados = new Set(alteracoesDetalhadas.map(a => a.idx));
  const dadosFiltrados = dadosProcessadosRef.current.reduce((linhas, row, idx) => {
    const texto = Object.values(row).join(' ').toLowerCase();
    const ativo = String(row['Ativo']);
    const foiAlterada = indicesAlterados.has(idx);
    
    const matchBusca = !searchTerm || texto.includes(searchTerm.toLowerCase());
    const matchAtivo = filtroAtivo === 'todos' || 
                       (filtroAtivo === 'ativos' && ativo === '1') ||
                       (filtroAtivo === 'inativos' && ativo === '0') ||
                       (filtroAtivo === 'alterados' && foiAlterada);
    
    if (matchBusca && matchAtivo) {
      linhas.push({ row, idx });
    }
    return linhas;
  }, []);

  const totalPaginas = Math.max(1, Math.ceil(dadosFiltrados.length / tamanhoPagina));
  const paginaSegura = Math.min(paginaAtual, totalPaginas);
  const inicioPagina = (paginaSegura - 1) * tamanhoPagina;
  const dadosPagina = dadosFiltrados.slice(inicioPagina, inicioPagina + tamanhoPagina);
  const totalPaginasDuplicados = Math.max(1, Math.ceil(duplicadosRef.current.length / tamanhoPagina));
  const paginaDuplicadosSegura = Math.min(paginaDuplicados, totalPaginasDuplicados);
  const inicioPaginaDuplicados = (paginaDuplicadosSegura - 1) * tamanhoPagina;
  const duplicadosPagina = duplicadosRef.current.slice(
    inicioPaginaDuplicados,
    inicioPaginaDuplicados + tamanhoPagina
  );

  return (
    <div className="container">
      <header>
        <h1>📋 Importação de {tipoCadastro ? (ehProduto ? 'Produtos' : ehFornecedor ? 'Fornecedores' : 'Clientes') : 'Cadastros'}</h1>
        <p>Importe uma planilha, mapeie os campos de origem e gere o arquivo no modelo correspondente.</p>
      </header>

      {step > 0 && (
        <div className="acoes-topo">
          <button type="button" className="btn btn-secondary" onClick={voltarSelecaoTipo}>
            ← Alterar tipo de importação
          </button>
        </div>
      )}

      {step === 0 && (
        <section className="tipo-cadastro card step-card" aria-labelledby="tipoCadastroTitulo">
          <h2 id="tipoCadastroTitulo">O que você deseja importar?</h2>
          <p className="tipo-cadastro-descricao">Escolha o modelo antes de carregar a planilha. Cada opção aplica seus próprios campos, validações e arquivo de saída.</p>
          <div className="tipo-cadastro-opcoes">
            <button type="button" className="tipo-cadastro-opcao" onClick={() => selecionarTipoCadastro('cliente')}>
              <span className="tipo-cadastro-icone">👥</span>
              <span>Clientes</span>
              <small>Cadastro de clientes e condições comerciais</small>
            </button>
            <button type="button" className="tipo-cadastro-opcao" onClick={() => selecionarTipoCadastro('fornecedor')}>
              <span className="tipo-cadastro-icone">🏢</span>
              <span>Fornecedores</span>
              <small>Modelo com código, conta contábil e dados de contato</small>
            </button>
            <button type="button" className="tipo-cadastro-opcao" onClick={() => selecionarTipoCadastro('produto')}>
              <span className="tipo-cadastro-icone">📦</span>
              <span>Produtos</span>
              <small>Cadastro de itens, unidades, fiscal e códigos de barras</small>
            </button>
          </div>
        </section>
      )}

      {step > 0 && (
      <nav className="stepper" aria-label="Etapas da importação">
        {['Importar', 'Mapear', 'Revisar', 'Configurar', 'Concluir'].map((titulo, indice) => {
          const numeroEtapa = indice + 1;
          const concluida = numeroEtapa < step;
          const atual = numeroEtapa === step;

          return (
            <button
              key={titulo}
              type="button"
              className={`stepper-item ${atual ? 'active' : ''} ${concluida ? 'completed' : ''}`}
              onClick={() => concluida && setStep(numeroEtapa)}
              disabled={!concluida}
              aria-current={atual ? 'step' : undefined}
            >
              <span className="stepper-number">{concluida ? '✓' : numeroEtapa}</span>
              <span className="stepper-label">{titulo}</span>
            </button>
          );
        })}
      </nav>
      )}

      {/* ETAPA 1: Upload */}
      {step === 1 && (
        <div className="card step-card" id="step1">
          <h2>1️⃣ Importar Planilha de Origem</h2>
          <div 
            className="upload-area" 
            id="uploadArea"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClickUpload}
          >
            <div className="upload-icon">📁</div>
            <p><strong>Clique aqui</strong> ou arraste sua planilha</p>
            <p style={{ fontSize: '12px', color: '#999' }}>Formatos aceitos: .xlsx, .xls (qualquer estrutura)</p>
            <input 
              type="file" 
              id="fileInput" 
              ref={fileInputRef}
              accept=".xlsx,.xls"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      )}

      {/* ETAPA 2: Mapeamento De/Para */}
      {step === 2 && (
        <div className="card step-card" id="step2">
          <h2>2️⃣ Mapeamento De/Para</h2>
          <div className="alert alert-info">
            ℹ️ A listagem abaixo mostra os <strong>campos da planilha de destino (Target3)</strong>. 
            Para cada campo, selecione qual <strong>campo da sua planilha importada</strong> corresponde. 
            Campos mapeados automaticamente não precisarão ser preenchidos manualmente na etapa seguinte.
          </div>

          {ehProduto && (
            <div className="alert alert-info">
              <strong>🏭 De/para de fabricantes</strong>
              <p>
                Carregue uma tabela com as colunas de descrição e código. O sistema converterá a descrição
                do fabricante para o código correspondente e também procurará o fabricante na descrição do produto.
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fabricantesInputRef.current?.click()}
              >
                📁 Importar tabela de fabricantes
              </button>
              <input
                ref={fabricantesInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFabricantesInput}
                style={{ display: 'none' }}
              />
              {resumoFabricantes && (
                <p style={{ marginTop: '10px', marginBottom: 0 }}>
                  ✅ <strong>{resumoFabricantes.arquivo}</strong>: {resumoFabricantes.fabricantes} fabricantes carregados
                  {resumoFabricantes.ambiguos > 0
                    ? `, ${resumoFabricantes.ambiguos} descrição(ões) com mais de um código`
                    : ''}
                </p>
              )}
            </div>
          )}

          {ehProduto && (
            <div className="alert alert-info">
              <strong>📚 De/para de linhas</strong>
              <p>
                Carregue a tabela de linhas com as colunas de descrição e código. O nome da linha
                informado na planilha de produtos será convertido somente para o código cadastrado.
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => linhasInputRef.current?.click()}
              >
                📁 Importar tabela de linhas
              </button>
              <input
                ref={linhasInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleLinhasInput}
                style={{ display: 'none' }}
              />
              {resumoLinhas && (
                <p style={{ marginTop: '10px', marginBottom: 0 }}>
                  ✅ <strong>{resumoLinhas.arquivo}</strong>: {resumoLinhas.linhas} linhas carregadas
                  {resumoLinhas.ambiguos > 0
                    ? `, ${resumoLinhas.ambiguos} descrição(ões) com mais de um código`
                    : ''}
                </p>
              )}
            </div>
          )}

          {ehProduto && (
            <div className="alert alert-warning">
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={desativarEstoqueZero}
                  onChange={(e) => setDesativarEstoqueZero(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span>
                  <strong>ESTQ 0 → DESATIVADOS</strong>
                  <br />
                  Quando marcado, produtos com ESTQ igual a 0 recebem automaticamente os códigos
                  de fabricante e linha DESATIVADOS das tabelas importadas.
                </span>
              </label>
            </div>
          )}
          
          <div className="mapeamento-header">
            <div>📤 CAMPO DE DESTINO (Target3)</div>
            <div></div>
            <div>📥 CAMPO DA PLANILHA IMPORTADA</div>
            <div style={{ textAlign: 'center' }}>STATUS</div>
          </div>
          <div className="mapeamento-lista" id="mapeamentoLista">
            {camposDestino.map(campo => {
              const mapeado = !!mapeamentoAtual[campo.nome];
              
              return (
                <div 
                  key={campo.nome} 
                  className={`mapeamento-item ${mapeado ? 'mapeado' : 'nao-mapeado'} ${campo.obrigatorio ? 'obrigatorio' : ''}`}
                >
                  <div className="campo-destino">
                    <div className="campo-destino-nome">{campo.nome}{campo.obrigatorio ? ' *' : ''}</div>
                    <div className="campo-destino-tipo">{campo.tipo} - {campo.dica}</div>
                  </div>
                  <div className="seta">→</div>
                  <div className="campo-origem">
                    <select
                      value={mapeamentoAtual[campo.nome] || ''}
                      onChange={(e) => handleMapeamentoChange(campo.nome, e.target.value)}
                    >
                      <option value="">-- Selecione --</option>
                      {camposOrigemRef.current.map(campoO => (
                        <option key={campoO} value={campoO}>{campoO}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mapeamento-status">
                    {mapeado ? '✅' : '⚠️'}
                  </div>
                </div>
              );
            })}
          </div>

          {processando && (
            <div className="progress-container" aria-live="polite">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progresso}%` }}></div>
              </div>
              <div className="progress-text">Preparando dados... {progresso}%</div>
            </div>
          )}
          <div className="mapeamento-resumo" id="mapeamentoResumo">
            <div className="mapeamento-resumo-item">
              <span className="dot dot-success"></span>
              <span>Mapeados: {Object.values(mapeamentoAtual).filter(v => v).length}/{camposDestino.length}</span>
            </div>
            <div className="mapeamento-resumo-item">
              <span className="dot dot-danger"></span>
              <span>Não mapeados: {camposDestino.length - Object.values(mapeamentoAtual).filter(v => v).length}</span>
            </div>
            <div className="mapeamento-resumo-item">
              <span className="dot dot-warning"></span>
              <span>Obrigatórios: {camposDestino.filter(c => c.obrigatorio).length}</span>
            </div>
          </div>
          
          <div className="actions">
            <button className="btn btn-primary" onClick={aplicarMapeamento}>✅ Aplicar Mapeamento</button>
            <button className="btn btn-secondary" onClick={mapearAutomaticamente}>🔄 Tentar Mapeamento Automático</button>
            <button className="btn btn-warning" onClick={resetarMapeamento}>↩️ Resetar</button>
          </div>
        </div>
      )}

      {/* ETAPA 3: Preview dos Dados */}
      {step === 3 && (
        <div className="card step-card" id="step3">
          <h2>3️⃣ Preview dos Dados Mapeados</h2>
          <div className="alert alert-success">
            ✅ Mapeamento aplicado com sucesso! <strong>{dadosMapeadosRef.current.length}</strong> registros detectados.
          </div>
          <div className="preview-table" id="previewTable">
            <table>
              <thead>
                <tr>
                  {Object.keys(dadosMapeadosRef.current[0] || {}).slice(0, 10).map(campo => (
                    <th key={campo}>{campo}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dadosMapeadosRef.current.slice(0, 5).map((row, idx) => (
                  <tr key={idx}>
                    {Object.entries(row).slice(0, 10).map(([campo, valor]) => (
                      <td key={campo}>{String(valor)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="actions">
            <button className="btn btn-success" onClick={processarDados}>🚀 Processar Dados</button>
            <button className="btn btn-secondary" onClick={voltarMapeamento}>↩️ Voltar ao Mapeamento</button>
          </div>
        </div>
      )}

      {/* ETAPA 4: Configuração Padrão */}
      {step === 4 && (
        <div className="card step-card" id="step4">
          <h2>4️⃣ Configurar Valores Padrão</h2>
          <div className="alert alert-info">
            ℹ️ Preencha apenas os campos que <strong>NÃO foram mapeados</strong> na etapa anterior.
            <br/>
            <strong style={{ color: '#28a745' }}>✓ Campos mapeados:</strong> já possuem valores da planilha e não serão sobrescritos.
            <br/>
            <strong style={{ color: '#dc3545' }}>⚠ Campos não mapeados:</strong> use os valores abaixo como padrão para todos os registros.
          </div>
          
          <div className="grid" id="gridConfigPadrao">
            {camposConfiguraveis.map(cfg => {
              // Verifica se o campo foi mapeado explicitamente
              const campoMapeado = !!mapeamentoAtual[cfg.campo];
              
              return (
                <div 
                  className={`form-group ${campoMapeado ? 'mapeado' : 'nao-mapeado'}`} 
                  key={cfg.campo}
                >
                  <label>
                    {cfg.label}
                    {campoMapeado && (
                      <span className="badge-mapeado">✓ Mapeado</span>
                    )}
                    {!campoMapeado && (
                      <span className="badge-padrao">⚠ Usará valor padrão</span>
                    )}
                  </label>
                  {cfg.tipo === 'select' ? (
                    <select
                      id={`default_${cfg.campo.replace(/\s/g, '_')}`}
                      value={configPadrao[cfg.campo] || ''}
                      onChange={(e) => handleConfigPadraoChange(cfg.campo, e.target.value)}
                      disabled={campoMapeado}
                    >
                      <option value="">-- Não preencher --</option>
                      {cfg.opcoes?.map(op => (
                        <option key={op.valor} value={op.valor}>{op.texto}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      id={`default_${cfg.campo.replace(/\s/g, '_')}`}
                      value={configPadrao[cfg.campo] || ''}
                      onChange={(e) => handleConfigPadraoChange(cfg.campo, e.target.value)}
                      disabled={campoMapeado}
                      placeholder={campoMapeado ? 'Valor virá da planilha' : cfg.placeholder || ''}
                      maxLength={cfg.maxlength}
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          {processando && (
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progresso}%` }}></div>
              </div>
              <div className="progress-text">Processando... {progresso}%</div>
            </div>
          )}
          
          <div className="actions">
            <button className="btn btn-secondary" onClick={() => setStep(3)}>← Voltar à revisão</button>
            <button 
              className="btn btn-primary" 
              onClick={processarPlanilha}
              disabled={processando}
            >
              {processando ? '⏳ Processando...' : '🔄 Processar Dados'}
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 5: Estatísticas e Tabela */}
      {step === 5 && estatisticas && (
        <>
          <div className="card step-card" id="step5">
            <h2>5️⃣ Resumo do Processamento</h2>
            <div className="stats" id="statsContainer">
              <div className="stat-card">
                <div className="label">Total</div>
                <div className="value">{estatisticas.total}</div>
              </div>
              <div className="stat-card success">
                <div className="label">Ativos</div>
                <div className="value">{estatisticas.ativos}</div>
              </div>
              <div className="stat-card warning">
                <div className="label">Inativos</div>
                <div className="value">{estatisticas.inativos}</div>
              </div>
              {!ehProduto && (
                <div className="stat-card danger">
                  <div className="label">Sem CNPJ/CPF</div>
                  <div className="value">{estatisticas.semCnpj}</div>
                </div>
              )}
              <div className="stat-card info">
                <div className="label">Linhas Alteradas</div>
                <div className="value">{estatisticas.linhasAlteradas}</div>
              </div>
            </div>
            <div className="actions">
              <button className="btn btn-success" onClick={exportarExcel}>📥 Exportar Excel</button>
              {alteracoesDetalhadas.length > 0 && (
                <>
                  <button className="btn btn-info" onClick={exportarApenasAlteracoes}>📥 Apenas Alterações</button>
                  <button className="btn btn-danger" onClick={descartarAlteracoes}>🗑️ Descartar Alterações</button>
                </>
              )}
              <button className="btn btn-secondary" onClick={resetar}>↩️ Nova Importação</button>
            </div>
          </div>

          {alteracoesDetalhadas.length > 0 && (
            <div className="alteracoes-banner" id="alteracoesBanner">
              <div className="info">
                <span>⚠️ Você tem {estatisticas.linhasAlteradas} linha(s) com alterações pendentes</span>
                <span className="contador">{alteracoesDetalhadas.length} alteração(ões)</span>
              </div>
              <div className="acoes">
                <button className="btn" onClick={exportarApenasAlteracoes}>Exportar Alterações</button>
              </div>
            </div>
          )}

          <div className="card">
            <h2>📊 Visualização e Edição</h2>
            
            <div className="tabs">
              <div 
                className={`tab ${activeTab === 'clientes' ? 'active' : ''}`}
                onClick={() => setActiveTab('clientes')}
              >
                {ehProduto ? 'Produtos' : ehFornecedor ? 'Fornecedores' : 'Clientes'}
              </div>
              {duplicadosRef.current.length > 0 && (
                <div
                  className={`tab ${activeTab === 'duplicados' ? 'active' : ''}`}
                  onClick={() => setActiveTab('duplicados')}
                >
                  Duplicados ({duplicadosRef.current.length})
                </div>
              )}
              <div 
                className={`tab ${activeTab === 'log' ? 'active' : ''}`}
                onClick={() => setActiveTab('log')}
              >
                Log de Alterações
              </div>
            </div>

            {activeTab === 'clientes' && (
              <>
                <div className="toolbar">
                  <input
                    type="text"
                    id="searchInput"
                    placeholder="🔍 Buscar em todos os campos..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPaginaAtual(1);
                    }}
                  />
                  <select
                    id="filterAtivo"
                    value={filtroAtivo}
                    onChange={(e) => {
                      setFiltroAtivo(e.target.value);
                      setPaginaAtual(1);
                    }}
                  >
                    <option value="todos">Todos</option>
                    <option value="ativos">Ativos</option>
                    <option value="inativos">Inativos</option>
                    <option value="alterados">Alterados</option>
                  </select>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(dadosProcessadosRef.current[0] || {}).map(campo => (
                          <th key={campo}>{campo}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dadosPagina.map(({ row, idx }) => {
                        const foiAlterado = alteracoesDetalhadas.some(a => a.idx === idx);
                        
                        return (
                          <tr key={idx} className={foiAlterado ? 'duplicado' : ''}>
                            {Object.entries(row).map(([campo, valor]) => (
                              <td key={campo}>
                                <input
                                  type="text"
                                  value={valor}
                                  onChange={(e) => atualizarCampo(idx, campo, e.target.value)}
                                  style={{
                                    background: alteracoesDetalhadas.some(a => a.idx === idx && a.campo === campo) 
                                      ? '#fef3c7' 
                                      : 'transparent'
                                  }}
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="paginacao" aria-label="Paginação da tabela">
                  <span className="paginacao-info">
                    Exibindo {dadosPagina.length ? inicioPagina + 1 : 0}-{inicioPagina + dadosPagina.length} de {dadosFiltrados.length} registros
                  </span>
                  <div className="paginacao-controles">
                    <select
                      value={tamanhoPagina}
                      onChange={(e) => {
                        setTamanhoPagina(Number(e.target.value));
                        setPaginaAtual(1);
                      }}
                      aria-label="Registros por página"
                    >
                      <option value={50}>50 por página</option>
                      <option value={100}>100 por página</option>
                      <option value={200}>200 por página</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setPaginaAtual(paginaSegura - 1)}
                      disabled={paginaSegura === 1}
                    >
                      Anterior
                    </button>
                    <span className="paginacao-pagina">Página {paginaSegura} de {totalPaginas}</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setPaginaAtual(paginaSegura + 1)}
                      disabled={paginaSegura === totalPaginas}
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'duplicados' && (
              <>
                <div className="alert alert-warning">
                  Estes registros têm o mesmo CNPJ/CPF de outro cliente e foram removidos da importação principal.
                </div>
                <div className="actions">
                  <button className="btn btn-warning" onClick={exportarDuplicados}>
                    Exportar somente duplicados
                  </button>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(duplicadosRef.current[0] || {}).map(campo => (
                          <th key={campo}>{campo}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {duplicadosPagina.map((row, idx) => (
                        <tr key={`${row['Cód Cliente'] || idx}-${inicioPaginaDuplicados + idx}`}>
                          {Object.entries(row).map(([campo, valor]) => (
                            <td key={campo}>{String(valor ?? '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="paginacao" aria-label="Paginação dos duplicados">
                  <span className="paginacao-info">
                    Exibindo {duplicadosPagina.length ? inicioPaginaDuplicados + 1 : 0}-{inicioPaginaDuplicados + duplicadosPagina.length} de {duplicadosRef.current.length} duplicados
                  </span>
                  <div className="paginacao-controles">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setPaginaDuplicados(paginaDuplicadosSegura - 1)}
                      disabled={paginaDuplicadosSegura === 1}
                    >
                      Anterior
                    </button>
                    <span className="paginacao-pagina">Página {paginaDuplicadosSegura} de {totalPaginasDuplicados}</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setPaginaDuplicados(paginaDuplicadosSegura + 1)}
                      disabled={paginaDuplicadosSegura === totalPaginasDuplicados}
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'log' && (
              <div id="logContainer">
                {logAlteracoes.slice().reverse().map((log, idx) => (
                  <div key={idx} className={`log-item ${log.tipo}`}>
                    <span className="timestamp">{new Date(log.timestamp).toLocaleString()}</span>
                    <p>{log.mensagem}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
