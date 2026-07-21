import { useState, useCallback, useRef } from 'react';
import XLSX from 'xlsx';
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
  regrasMapeamentoProdutos
} from './data/produtos';
import {
  limparCnpjCpf,
  limparCep,
  separarTelefone,
  mapearTipoPessoa,
  mapearTipoInscricao,
  parseData,
  mapearAtivo,
  normalizarTexto,
  detectarMapeamentoAutomatico
} from './utils/helpers';

function App() {
  const [step, setStep] = useState(0);
  const [tipoCadastro, setTipoCadastro] = useState(null);
  const [configPadrao, setConfigPadrao] = useState({});
  const [activeTab, setActiveTab] = useState('clientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [processando, setProcessando] = useState(false);
  const fileInputRef = useRef(null);
  
  // REFS PARA DADOS MASSIVOS (evita re-renders)
  const dadosOriginaisRef = useRef([]);
  const camposOrigemRef = useRef([]);
  const dadosMapeadosRef = useRef([]);
  const dadosProcessadosRef = useRef([]);
  const duplicadosRef = useRef([]);
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
          const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          
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
  }, [campoCodigo, camposDestino, mapeamentoAtual, processando]);

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
      
      const processChunk = () => {
        const chunkEnd = Math.min(currentIndex + chunkSize, total);
        
        // Filtrar e processar chunk atual
        for (let i = currentIndex; i < chunkEnd; i++) {
          const row = dadosParaProcessar[i];
          const codigo = String(row[campoCodigo] || '').trim();
          
          if (codigo === '') continue;
          
          const tel1 = separarTelefone(row['Numero Tel'] || row['DDD'] || '');
          const tel2 = separarTelefone(row['Numero_2'] || row['DDD_2'] || '');

          let registro = {
            'Cód Cliente': codigo,
            'Nome': normalizarTexto(row['Nome']) || configPadrao['Nome'] || '',
            'Nome Fantasia': normalizarTexto(row['Nome Fantasia']) || configPadrao['Nome Fantasia'] || '',
            'Tipo de Pessoa': mapearTipoPessoa(row['Tipo de Pessoa']) || configPadrao['Tipo de Pessoa'] || 'F',
            'CNPJ/CPF': limparCnpjCpf(row['CNPJ/CPF']),
            'Tipo de Inscrição': mapearTipoInscricao(row),
            'Inscrição': row['Inscrição'] || '',
            'Segmento': row['Segmento'] || configPadrao['Segmento'] || 'CL',
            'Cód Grupo de Cliente': row['Cód Grupo de Cliente'] || configPadrao['Cód Grupo de Cliente'] || '',
            'Data de Cadastro': parseData(row['Data de Cadastro']) || parseData(new Date()) || '01/01/2024',
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
            'Endereco': row['Endereco'] || '',
            'Bairro': row['Bairro'] || '',
            'Municipio': row['Municipio'] || '',
            'Cep': limparCep(row['Cep']),
            'Estado': row['Estado'] || '',
            'Numero': row['Numero'] || '',
            'Complemento': row['Complemento'] || '',
            'DDD': tel1.ddd,
            'Numero Tel': tel1.numero,
            'Nome Contato': row['Nome Contato'] || '',
            'Cargo': row['Cargo'] || configPadrao['Cargo'] || '',
            'Email Contato': row['Email Contato'] || '',
            'DDD_2': tel2.ddd,
            'Numero_2': tel2.numero,
            'Cód Vendedor': row['Cód Vendedor'] || configPadrao['Cód Vendedor'] || 'PATRICKK',
            'Ativo': mapearAtivo(row['Ativo']) !== undefined ? mapearAtivo(row['Ativo']) : 1
          };

          if (ehFornecedor) {
            const telefone = separarTelefone(row['Telefone'] || '');
            const telefone2 = separarTelefone(row['Telefone 2'] || '');

            registro = {
              'Cód Fornec': codigo,
              'Tipo': row['Tipo'] || configPadrao['Tipo'] || '',
              'Segmento (4)': row['Segmento (4)'] || configPadrao['Segmento (4)'] || '',
              'Nome': normalizarTexto(row['Nome']),
              'Nome Fantasia': normalizarTexto(row['Nome Fantasia']),
              'Tipo de Pessoa': mapearTipoPessoa(row['Tipo de Pessoa']),
              'CNPJ/CPF': limparCnpjCpf(row['CNPJ/CPF']),
              'Tipo de Inscrição': row['Tipo de Inscrição'] !== undefined ? mapearTipoInscricao(row) : '',
              'Inscrição': row['Inscrição'] || '',
              'Conta Contábil': row['Conta Contábil'] || configPadrao['Conta Contábil'] || '',
              'Data de Cadastro': parseData(row['Data de Cadastro']),
              'Email': row['Email'] || '',
              'Endereço': row['Endereço'] || '',
              'Bairro': row['Bairro'] || '',
              'Municipio': row['Municipio'] || '',
              'Cep': limparCep(row['Cep']),
              'Estado': row['Estado'] || '',
              'Numero': row['Numero'] || '',
              'Complemento': row['Complemento'] || '',
              'DDD': row['DDD'] || telefone.ddd,
              'Telefone': telefone.numero || row['Telefone'] || '',
              'DDD 2': row['DDD 2'] || telefone2.ddd,
              'Telefone 2': telefone2.numero || row['Telefone 2'] || '',
              'Nome Contato': row['Nome Contato'] || '',
              'Site': row['Site'] || '',
              'Cargo': row['Cargo'] || configPadrao['Cargo'] || '',
              'Email Contato': row['Email Contato'] || '',
              'Ativo': row['Ativo'] !== undefined ? mapearAtivo(row['Ativo']) : ''
            };
          }

          if (ehProduto) {
            registro = Object.fromEntries(
              camposDestinoProdutos.map(({ nome }) => [nome, row[nome] || configPadrao[nome] || ''])
            );
            registro['Cod Produto'] = codigo;
            registro['Descrição'] = normalizarTexto(row['Descrição']);
            registro['Desc Resumida'] = normalizarTexto(row['Desc Resumida']);
            registro['Data Cadastro'] = parseData(row['Data Cadastro']);
            registro['Ativo'] = row['Ativo'] !== undefined
              ? mapearAtivo(row['Ativo'])
              : configPadrao['Ativo'] !== undefined ? mapearAtivo(configPadrao['Ativo']) : '';
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

          const enderecoPreenchido = String(registro['Endereco'] || registro['Endereço'] || '').trim() !== '';
          if (enderecoPreenchido && String(registro['Numero'] || '').trim() === '') {
            registro['Numero'] = 'S/N';
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
        }
      };
      
      // Inicia processamento após renderização
      requestAnimationFrame(processChunk);
    }, 100);
  }, [campoCodigo, campoDuplicidade, camposDestino, configPadrao, ehFornecedor, ehProduto, nomeCadastro]);

  // Atualização de campos
  const atualizarCampo = useCallback((idx, campo, valor) => {
      const novosDados = [...dadosProcessadosRef.current];
      const valorAnterior = novosDados[idx][campo];
      
      if (valorAnterior !== valor) {
        novosDados[idx] = { ...novosDados[idx], [campo]: valor };
        
        setAlteracoesDetalhadas(prevAlt => {
          const novaAlteracao = {
            idx,
            campo,
            valorAnterior,
            novoValor: valor,
            timestamp: new Date().toISOString()
          };
          return [...prevAlt, novaAlteracao];
        });

        setLogAlteracoes(prevLog => [
          ...prevLog,
          {
            timestamp: new Date().toISOString(),
            mensagem: `Campo "${campo}" alterado de "${valorAnterior}" para "${valor}"`,
            tipo: 'info'
          }
        ]);
      }
      
      dadosProcessadosRef.current = novosDados;
  }, []);

  // Exportação
  const exportarExcel = useCallback(() => {
    const camposModelo = (ehFornecedor ? camposDestinoFornecedores : camposDestinoProdutos).map(({ nome }) => nome);
    const ws = (ehFornecedor || ehProduto)
      ? XLSX.utils.json_to_sheet(dadosProcessadosRef.current, { header: camposModelo, skipHeader: true, origin: 'A2' })
      : XLSX.utils.json_to_sheet(dadosProcessadosRef.current);

    if (ehFornecedor || ehProduto) {
      const cabecalhosModelo = camposModelo.map(campo => ehFornecedor && campo === 'Email Contato' ? 'Email' : campo);
      XLSX.utils.sheet_add_aoa(ws, [cabecalhosModelo], { origin: 'A1' });
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, ehProduto ? 'Produtos' : ehFornecedor ? 'Fornecedores' : 'Clientes');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    XLSX.writeFile(wb, `${ehProduto ? 'PRODUTOS' : ehFornecedor ? 'FORNECEDORES' : 'CLIENTES'}_IMPORT_${timestamp}.xls`, { bookType: 'biff8' });
  }, [ehFornecedor, ehProduto]);

  const exportarApenasAlteracoes = useCallback(() => {
    const indicesAlterados = [...new Set(alteracoesDetalhadas.map(a => a.idx))];
    const dadosAlterados = indicesAlterados.map(idx => dadosProcessadosRef.current[idx]);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const ws = XLSX.utils.json_to_sheet(dadosAlterados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alterados');
    XLSX.writeFile(wb, `CLIENTES_SOMENTE_ALTERADOS_${timestamp}.xls`, { bookType: 'biff8' });
  }, [alteracoesDetalhadas]);

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
