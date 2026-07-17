import { useState, useCallback } from 'react';
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
  const [dadosOriginais, setDadosOriginais] = useState([]);
  const [camposOrigem, setCamposOrigem] = useState([]);
  const [dadosMapeados, setDadosMapeados] = useState([]);
  const [dadosProcessados, setDadosProcessados] = useState([]);
  const [mapeamentoAtual, setMapeamentoAtual] = useState({});
  const [configPadrao, setConfigPadrao] = useState({});
  const [activeTab, setActiveTab] = useState('clientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const [alteracoesDetalhadas, setAlteracoesDetalhadas] = useState([]);
  const [logAlteracoes, setLogAlteracoes] = useState([]);

  // Upload de arquivo
  const handleFileUpload = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      
      setDadosOriginais(jsonData);
      if (jsonData.length > 0) {
        const campos = Object.keys(jsonData[0]);
        setCamposOrigem(campos);
      }
      setStep(2);
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
  }, [handleFileUpload]);

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
        `Existem ${obrigatoriosNaoMapeados.length} campos obrigatórios não mapeados. Deseja continuar mesmo assim?`
      );
      if (!continuar) return;
    }

    const dadosMapeadosNovo = dadosOriginais.map(row => {
      const newRow = {};
      camposDestino.forEach(campo => {
        const campoOrigem = mapeamentoAtual[campo.nome];
        if (campoOrigem && row[campoOrigem] !== undefined) {
          newRow[campo.nome] = row[campoOrigem];
        } else {
          newRow[campo.nome] = '';
        }
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
    const dadosComCodigo = dadosMapeados.filter(row => {
      const codigo = String(row['Cód Cliente'] || '').trim();
      return codigo !== '';
    });

    const ordenados = [...dadosComCodigo].sort((a, b) => {
      const ca = String(a['Cód Cliente'] || '').padStart(10, '0');
      const cb = String(b['Cód Cliente'] || '').padStart(10, '0');
      return ca.localeCompare(cb);
    });

    const vistos = new Map();
    const unicos = [];
    const duplicadosEncontrados = [];

    ordenados.forEach((row, idx) => {
      const cnpj = limparCnpjCpf(row['CNPJ/CPF']);
      const nome = normalizarTexto(row['Nome']);
      const fantasia = normalizarTexto(row['Nome Fantasia']);
      const chave = `${cnpj}-${nome}-${fantasia}`;

      if (vistos.has(chave)) {
        duplicadosEncontrados.push({ ...row, idx, duplicadoDe: vistos.get(chave) });
      } else {
        vistos.set(chave, idx);
        unicos.push(row);
      }
    });

    const dadosProcessadosNovo = unicos.map((row, idx) => {
      const codigo = row['Cód Cliente'];
      const nome = row['Nome'];

      const tel1 = separarTelefone(row['Numero Tel'] || row['DDD'] || '');
      const tel2 = separarTelefone(row['Numero_2'] || row['DDD_2'] || '');

      const registro = {
        'Cód Cliente': codigo,
        'Nome': nome || configPadrao['Nome'] || '',
        'Nome Fantasia': row['Nome Fantasia'] || configPadrao['Nome Fantasia'] || '',
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

      return registro;
    });

    setDadosProcessados(dadosProcessadosNovo);
    setStep(5);
    
    const novaAlteracao = {
      timestamp: new Date().toISOString(),
      mensagem: `Processamento concluído: ${dadosProcessadosNovo.length} registros`,
      tipo: 'success'
    };
    setLogAlteracoes(prev => [...prev, novaAlteracao]);
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
          >
            <div className="upload-icon">📁</div>
            <p><strong>Clique aqui</strong> ou arraste sua planilha</p>
            <p style={{ fontSize: '12px', color: '#999' }}>Formatos aceitos: .xlsx, .xls (qualquer estrutura)</p>
            <input 
              type="file" 
              id="fileInput" 
              accept=".xlsx,.xls"
              onChange={handleFileInput}
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
            ℹ️ Preencha apenas os campos que <strong>NÃO vieram da planilha de origem</strong>. 
            Campos mapeados automaticamente estão ocultos (você pode editar individualmente depois).
          </div>
          
          <div className="grid" id="gridConfigPadrao">
            {camposConfiguraveis.map(cfg => {
              const campoMapeado = Object.values(mapeamentoAtual).includes(cfg.campo);
              if (campoMapeado) return null;
              
              return (
                <div className="form-group" key={cfg.campo}>
                  <label>{cfg.label}</label>
                  {cfg.tipo === 'select' ? (
                    <select
                      id={`default_${cfg.campo.replace(/\s/g, '_')}`}
                      defaultValue={cfg.default}
                      onChange={(e) => handleConfigPadraoChange(cfg.campo, e.target.value)}
                    >
                      {cfg.opcoes?.map(op => (
                        <option key={op.valor} value={op.valor}>{op.texto}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      id={`default_${cfg.campo.replace(/\s/g, '_')}`}
                      defaultValue={cfg.default}
                      maxLength={cfg.maxlength}
                      onChange={(e) => handleConfigPadraoChange(cfg.campo, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="actions">
            <button className="btn btn-primary" onClick={processarPlanilha}>🔄 Processar Dados</button>
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
