export const camposDestinoFornecedores = [
  { nome: 'Cód Fornec', obrigatorio: true, tipo: 'Numérico', dica: 'Código único do fornecedor' },
  { nome: 'Tipo', obrigatorio: true, tipo: 'Texto (1)', dica: 'O = Fornecedor | T = Transportadora' },
  { nome: 'Segmento (4)', obrigatorio: true, tipo: 'Texto (máx 4)', dica: 'Segmento cadastrado no ERP' },
  { nome: 'Nome', obrigatorio: true, tipo: 'Texto', dica: 'Razão social ou nome completo' },
  { nome: 'Nome Fantasia', obrigatorio: false, tipo: 'Texto', dica: 'Nome fantasia' },
  { nome: 'Tipo de Pessoa', obrigatorio: true, tipo: 'Texto (1)', dica: 'F = Física | J = Jurídica' },
  { nome: 'CNPJ/CPF', obrigatorio: true, tipo: 'Texto (máx 14)', dica: 'Apenas dígitos' },
  { nome: 'Tipo de Inscrição', obrigatorio: true, tipo: 'Texto (1)', dica: 'E = Estadual | M = Municipal | I = Isento' },
  { nome: 'Inscrição', obrigatorio: false, tipo: 'Texto', dica: 'IE ou RG' },
  { nome: 'Conta Contábil', obrigatorio: true, tipo: 'Texto (máx 15)', dica: 'Conta cadastrada no ERP' },
  { nome: 'Data de Cadastro', obrigatorio: true, tipo: 'Data', dica: 'Formato dd/mm/aaaa' },
  { nome: 'Email', obrigatorio: false, tipo: 'Texto', dica: 'E-mail principal' },
  { nome: 'Endereço', obrigatorio: true, tipo: 'Texto (máx 60)', dica: 'Logradouro sem número ou complemento' },
  { nome: 'Bairro', obrigatorio: true, tipo: 'Texto (máx 60)', dica: 'Bairro' },
  { nome: 'Municipio', obrigatorio: true, tipo: 'Texto (máx 60)', dica: 'Cidade' },
  { nome: 'Cep', obrigatorio: true, tipo: 'Numérico', dica: 'Apenas dígitos' },
  { nome: 'Estado', obrigatorio: true, tipo: 'Texto (2)', dica: 'Sigla UF' },
  { nome: 'Numero', obrigatorio: true, tipo: 'Texto (máx 15)', dica: 'Número do endereço' },
  { nome: 'Complemento', obrigatorio: false, tipo: 'Texto', dica: 'Complemento' },
  { nome: 'DDD', obrigatorio: false, tipo: 'Texto', dica: 'DDD do telefone' },
  { nome: 'Telefone', obrigatorio: false, tipo: 'Texto', dica: 'Telefone principal' },
  { nome: 'DDD 2', obrigatorio: false, tipo: 'Texto', dica: 'DDD do segundo telefone' },
  { nome: 'Telefone 2', obrigatorio: false, tipo: 'Texto', dica: 'Segundo telefone' },
  { nome: 'Nome Contato', obrigatorio: false, tipo: 'Texto', dica: 'Nome do contato' },
  { nome: 'Site', obrigatorio: false, tipo: 'Texto', dica: 'Website' },
  { nome: 'Cargo', obrigatorio: false, tipo: 'Texto', dica: 'Cargo do contato' },
  { nome: 'Email Contato', obrigatorio: false, tipo: 'Texto', dica: 'Segundo campo Email do modelo' },
  { nome: 'Ativo', obrigatorio: true, tipo: 'Booleano (0/1)', dica: '1 = Ativo | 0 = Inativo' }
];

export const camposConfiguraveisFornecedores = [
  {
    campo: 'Tipo',
    default: '',
    label: 'Tipo *',
    tipo: 'select',
    opcoes: [{ valor: 'O', texto: 'O - Fornecedor' }, { valor: 'T', texto: 'T - Transportadora' }]
  },
  { campo: 'Segmento (4)', default: '', label: 'Segmento *', maxlength: 4 },
  { campo: 'Nome', default: '', label: 'Nome *', maxlength: 60 },
  {
    campo: 'Tipo de Pessoa',
    default: '',
    label: 'Tipo de Pessoa *',
    tipo: 'select',
    opcoes: [{ valor: 'F', texto: 'F - Pessoa Física' }, { valor: 'J', texto: 'J - Pessoa Jurídica' }]
  },
  {
    campo: 'Tipo de Inscrição',
    default: '',
    label: 'Tipo de Inscrição *',
    tipo: 'select',
    opcoes: [
      { valor: 'E', texto: 'E - Estadual' },
      { valor: 'M', texto: 'M - Municipal' },
      { valor: 'I', texto: 'I - Isento' }
    ]
  },
  { campo: 'Conta Contábil', default: '', label: 'Conta Contábil *', maxlength: 15 },
  { campo: 'Data de Cadastro', default: '', label: 'Data de Cadastro *', placeholder: 'dd/mm/aaaa', maxlength: 10 },
  { campo: 'Endereço', default: '', label: 'Endereço *', maxlength: 60 },
  { campo: 'Bairro', default: '', label: 'Bairro *', maxlength: 60 },
  { campo: 'Municipio', default: '', label: 'Município *', maxlength: 60 },
  { campo: 'Cep', default: '', label: 'CEP *', maxlength: 8 },
  { campo: 'Estado', default: '', label: 'Estado (UF) *', maxlength: 2 },
  { campo: 'Numero', default: '', label: 'Número *', maxlength: 15 },
  {
    campo: 'Ativo',
    default: '',
    label: 'Ativo *',
    tipo: 'select',
    opcoes: [{ valor: '1', texto: 'Sim' }, { valor: '0', texto: 'Não' }]
  },
  { campo: 'Cargo', default: '', label: 'Cargo Contato', maxlength: 20 }
];

export const regrasMapeamentoFornecedores = {
  'Cód Fornec': ['cód fornec', 'cod fornec', 'cód. fornec', 'cod. fornec', 'cód fornecedor', 'cod fornecedor', 'código fornecedor', 'codigo fornecedor', 'cod_fornec', 'id fornecedor', 'id'],
  'Tipo': ['tipo fornecedor', 'classificação', 'classificacao', 'tipo'],
  'Segmento (4)': ['segmento', 'seg'],
  'Nome': ['nome', 'razão social', 'razao social', 'fornecedor'],
  'Nome Fantasia': ['fantasia', 'nome fantasia', 'nome comercial'],
  'Tipo de Pessoa': ['tipo pessoa', 'tipo de pessoa', 'pessoa'],
  'CNPJ/CPF': ['cnpj', 'cpf', 'cnpj/cpf', 'documento'],
  'Tipo de Inscrição': ['tipo inscrição', 'tipo inscricao'],
  'Inscrição': ['inscrição', 'inscricao', 'ie', 'rg'],
  'Conta Contábil': ['conta contábil', 'conta contabil', 'conta'],
  'Data de Cadastro': ['data cadastro', 'data de cadastro', 'dt cadastro'],
  'Email': ['e-mail', 'email', 'mail'],
  'Endereço': ['endereço', 'endereco', 'logradouro', 'rua', 'avenida'],
  'Bairro': ['bairro'],
  'Municipio': ['cidade', 'município', 'municipio'],
  'Cep': ['cep'],
  'Estado': ['uf', 'estado'],
  'Numero': ['número', 'numero', 'num'],
  'Complemento': ['complemento'],
  'DDD': ['ddd', 'telefone', 'fone'],
  'Telefone': ['telefone', 'fone', 'tel'],
  'DDD 2': ['ddd 2', 'ddd2', 'ddd celular'],
  'Telefone 2': ['telefone 2', 'telefone2', 'celular', 'mobile'],
  'Nome Contato': ['contato', 'responsável', 'responsavel'],
  'Site': ['site', 'website'],
  'Cargo': ['cargo', 'função', 'funcao'],
  'Email Contato': ['email contato', 'e-mail contato', 'email secundário'],
  'Ativo': ['ativo', 'status', 'situação', 'situacao']
};
