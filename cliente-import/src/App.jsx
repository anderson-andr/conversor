import { useState, useCallback, useEffect, useRef } from 'react';
import XLSX from 'xlsx';
import './App.css';
import { camposDestino, camposConfiguraveis, regrasMapeamento } from './data/campos';
import {
  apenasDigitos,
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
  const [step, setStep] = useState(1);
  const [configPadrao, setConfigPadrao] = useState({
    segmento: 'CL',
    tabPreco: 'PADRAO',
    formPgto: 'DP',
    condPgto: '1',
    vendedor: 'PATRICKK',
    tributacao: '1'
  });
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
  const mapeamentoAtualRef = useRef({});
  
  // PAGINAÇÃO
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(100);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [dadosFiltradosCount, setDadosFiltradosCount] = useState(0);
  
  // ESTADOS LEVES PARA UI
  const [logAlteracoes, setLogAlteracoes] = useState([]);
  const [alteracoesDetalhadas, setAlteracoesDetalhadas] = useState([]);
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const [progresso, setProgresso] = useState(0);
  const [stats, setStats] = useState({ total: 0, validos: 0, duplicados: 0 });

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
      const origemDetectada = detectarMapeamentoAutomatico(campo.nome, camposOrigem, regrasMapeamento);
      if (origemDetectada) {
        novoMapeamento[campo.nome] = origemDetectada;
      }
    });
    setMapeamentoAtual(novoMapeamento);
  }, [camposOrigem]);

  const resetarMapeamento = useCallback(() => {
    setMapeamentoAtual({});
  }, []);

  const aplicarMapeamento = useCallback(() => {
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
    const dadosMapeadosNovo = dadosOriginais.map(row => {
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
    });

    setDadosMapeados(dadosMapeadosNovo);
    setStep(3);
  }, [dadosOriginais, mapeamentoAtual]);

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
      const total = dadosMapeados.length;
      const chunkSize = 1000; // Aumentado para 1000 registros por vez (mais eficiente)
      let currentIndex = 0;
      const dadosProcessadosNovo = [];
      
      const processChunk = () => {
        const startTime = performance.now();
        const chunkEnd = Math.min(currentIndex + chunkSize, total);
        
        // Filtrar e processar chunk atual
        for (let i = currentIndex; i < chunkEnd; i++) {
          const row = dadosMapeados[i];
          const codigo = String(row['Cód Cliente'] || '').trim();
          
          if (codigo === '') continue;
          
          const tel1 = separarTelefone(row['Numero Tel'] || row['DDD'] || '');
          const tel2 = separarTelefone(row['Numero_2'] || row['DDD_2'] || '');

          const registro = {
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

          dadosProcessadosNovo.push(registro);
        }
        
        currentIndex = chunkEnd;
        setProgresso(Math.round((currentIndex / total) * 100));
        
        // Verifica tempo de processamento do chunk
        const elapsed = performance.now() - startTime;
        
        if (currentIndex < total) {
          // Sempre usa setTimeout para dar controle ao event loop
          setTimeout(processChunk, 0);
        } else {
          // Finalização: ordenar e remover duplicatas (CNPJ igual mantém menor código)
          const ordenados = [...dadosProcessadosNovo].sort((a, b) => {
            const ca = String(a['Cód Cliente'] || '').padStart(10, '0');
            const cb = String(b['Cód Cliente'] || '').padStart(10, '0');
            return ca.localeCompare(cb);
          });

          const vistos = new Map();
          const unicos = [];
          const listaDuplicados = [];

          for (let i = 0; i < ordenados.length; i++) {
            const row = ordenados[i];
            const cnpj = limparCnpjCpf(row['CNPJ/CPF']);
            
            // Usa apenas CNPJ como chave para duplicidade
            const chave = cnpj;
            
            if (!vistos.has(chave)) {
              // Primeiro registro com este CNPJ (menor código pois está ordenado)
              vistos.set(chave, row['Cód Cliente']);
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

          setDadosProcessados(unicos);
          setDuplicados(listaDuplicados);
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
  }, [dadosMapeados, configPadrao]);

  // Atualização de campos
  const atualizarCampo = useCallback((idx, campo, valor) => {
    setDadosProcessados(prev => {
      const novosDados = [...prev];
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
      
      return novosDados;
    });
  }, []);

  // Exportação
  const exportarExcel = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet(dadosProcessados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    XLSX.writeFile(wb, `CLIENTES_IMPORT_${timestamp}.xlsx`);
  }, [dadosProcessados]);

  const exportarApenasAlteracoes = useCallback(() => {
    const indicesAlterados = [...new Set(alteracoesDetalhadas.map(a => a.idx))];
    const dadosAlterados = indicesAlterados.map(idx => dadosProcessados[idx]);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const ws = XLSX.utils.json_to_sheet(dadosAlterados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alterados');
    XLSX.writeFile(wb, `CLIENTES_SOMENTE_ALTERADOS_${timestamp}.xlsx`);
  }, [dadosProcessados, alteracoesDetalhadas]);

  const descartarAlteracoes = useCallback(() => {
    if (window.confirm('Deseja realmente descartar todas as alterações feitas?')) {
      setAlteracoesDetalhadas([]);
      setLogAlteracoes([]);
    }
  }, []);

  const resetar = useCallback(() => {
    if (window.confirm('Deseja realmente resetar todo o processo?')) {
      setStep(1);
      setDadosOriginais([]);
      setCamposOrigem([]);
      setDadosMapeados([]);
      setDadosProcessados([]);
      setMapeamentoAtual({});
      setConfigPadrao({});
      setAlteracoesDetalhadas([]);
      setLogAlteracoes([]);
    }
  }, []);

  // Estatísticas
  const estatisticas = dadosProcessados.length > 0 ? {
    total: dadosProcessados.length,
    ativos: dadosProcessados.filter(r => r['Ativo'] === 1).length,
    inativos: dadosProcessados.filter(r => r['Ativo'] === 0).length,
    semCnpj: dadosProcessados.filter(r => !r['CNPJ/CPF']).length,
    linhasAlteradas: new Set(alteracoesDetalhadas.map(a => a.idx)).size
  } : null;

  // Filtros
  const dadosFiltrados = dadosProcessados.filter((row, idx) => {
    const texto = Object.values(row).join(' ').toLowerCase();
    const ativo = String(row['Ativo']);
    const foiAlterada = alteracoesDetalhadas.some(a => a.idx === idx);
    
    const matchBusca = !searchTerm || texto.includes(searchTerm.toLowerCase());
    const matchAtivo = filtroAtivo === 'todos' || 
                       (filtroAtivo === 'ativos' && ativo === '1') ||
                       (filtroAtivo === 'inativos' && ativo === '0') ||
                       (filtroAtivo === 'alterados' && foiAlterada);
    
    return matchBusca && matchAtivo;
  });

  return (
    <div className="container">
      <header>
        <h1>📋 Importação de Clientes - Com Mapeamento De/Para</h1>
        <p>Importe planilhas de qualquer estrutura e mapeie os campos da planilha de origem para os campos do Target3</p>
      </header>

      {/* ETAPA 1: Upload */}
      {step >= 1 && (
        <div className={`card ${step < 1 ? 'hidden' : ''}`} id="step1">
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
      {step >= 2 && (
        <div className={`card ${step < 2 ? 'hidden' : ''}`} id="step2">
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
              const origemDetectada = detectarMapeamentoAutomatico(campo.nome, camposOrigem, regrasMapeamento);
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
                      {camposOrigem.map(campoO => (
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
      {step >= 3 && (
        <div className={`card ${step < 3 ? 'hidden' : ''}`} id="step3">
          <h2>3️⃣ Preview dos Dados Mapeados</h2>
          <div className="alert alert-success">
            ✅ Mapeamento aplicado com sucesso! <strong>{dadosMapeados.length}</strong> registros detectados.
          </div>
          <div className="preview-table" id="previewTable">
            <table>
              <thead>
                <tr>
                  {Object.keys(dadosMapeados[0] || {}).slice(0, 10).map(campo => (
                    <th key={campo}>{campo}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dadosMapeados.slice(0, 5).map((row, idx) => (
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
      {step >= 4 && (
        <div className={`card ${step < 4 ? 'hidden' : ''}`} id="step4">
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
                      defaultValue={configPadrao[cfg.campo] || cfg.default}
                      onChange={(e) => handleConfigPadraoChange(cfg.campo, e.target.value)}
                      disabled={campoMapeado}
                    >
                      {cfg.opcoes?.map(op => (
                        <option key={op.valor} value={op.valor}>{op.texto}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      id={`default_${cfg.campo.replace(/\s/g, '_')}`}
                      defaultValue={configPadrao[cfg.campo] || cfg.default}
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
      {step >= 5 && estatisticas && (
        <>
          <div className={`card ${step < 5 ? 'hidden' : ''}`} id="step5">
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
              <div className="stat-card danger">
                <div className="label">Sem CNPJ/CPF</div>
                <div className="value">{estatisticas.semCnpj}</div>
              </div>
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
                Clientes
              </div>
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <select
                    id="filterAtivo"
                    value={filtroAtivo}
                    onChange={(e) => setFiltroAtivo(e.target.value)}
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
                        {Object.keys(dadosProcessados[0] || {}).map(campo => (
                          <th key={campo}>{campo}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dadosFiltrados.map((row, idxReal) => {
                        const idx = dadosProcessados.indexOf(row);
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
