// ============================================
// CONFIGURAÇÃO DE CAMPOS DE DESTINO (Target3)
// ============================================
export const camposDestino = [
    { nome: 'Cód Cliente', obrigatorio: true, tipo: 'Numérico', dica: 'Código único do cliente' },
    { nome: 'Nome', obrigatorio: true, tipo: 'Texto (máx 60)', dica: 'Razão social ou nome completo' },
    { nome: 'Nome Fantasia', obrigatorio: true, tipo: 'Texto (máx 20)', dica: 'Nome fantasia' },
    { nome: 'Tipo de Pessoa', obrigatorio: true, tipo: 'Texto (1)', dica: 'F = Física | J = Jurídica' },
    { nome: 'CNPJ/CPF', obrigatorio: true, tipo: 'Texto (máx 14)', dica: 'Apenas dígitos' },
    { nome: 'Tipo de Inscrição', obrigatorio: true, tipo: 'Texto (1)', dica: 'E = Estadual | M = Municipal | I = Isento' },
    { nome: 'Inscrição', obrigatorio: false, tipo: 'Texto (máx 20)', dica: 'IE ou RG' },
    { nome: 'Segmento', obrigatorio: true, tipo: 'Texto (máx 4)', dica: 'Deve estar cadastrado no ERP' },
    { nome: 'Cód Grupo de Cliente', obrigatorio: false, tipo: 'Texto (máx 10)', dica: 'Opcional' },
    { nome: 'Data de Cadastro', obrigatorio: true, tipo: 'Data (dd/mm/aaaa)', dica: 'Formato dd/mm/aaaa' },
    { nome: 'Data da 1ª compra', obrigatorio: false, tipo: 'Data (dd/mm/aaaa)', dica: 'Formato dd/mm/aaaa' },
    { nome: 'Data Ult Compra', obrigatorio: false, tipo: 'Data (dd/mm/aaaa)', dica: 'Formato dd/mm/aaaa' },
    { nome: 'Limite de Crédito', obrigatorio: false, tipo: 'Numérico', dica: 'Valor do limite' },
    { nome: 'Cód Tab Preço', obrigatorio: true, tipo: 'Texto (máx 8)', dica: 'Tabela de preços' },
    { nome: 'Form De Pgto', obrigatorio: true, tipo: 'Texto (máx 2)', dica: 'DP / CA / DC' },
    { nome: 'Condição De Pgto', obrigatorio: false, tipo: 'Numérico', dica: 'Código da condição' },
    { nome: 'Email', obrigatorio: false, tipo: 'Texto (máx 80)', dica: 'E-mail principal' },
    { nome: 'Site', obrigatorio: false, tipo: 'Texto (máx 50)', dica: 'Website' },
    { nome: 'Cód Rota', obrigatorio: false, tipo: 'Texto (máx 8)', dica: 'Código da rota' },
    { nome: 'Banco', obrigatorio: false, tipo: 'Numérico', dica: 'Código do banco' },
    { nome: 'Agência', obrigatorio: false, tipo: 'Texto (máx 8)', dica: 'Código da agência' },
    { nome: 'Conta', obrigatorio: false, tipo: 'Texto (máx 10)', dica: 'Número da conta' },
    { nome: 'Cód Tipo tributação', obrigatorio: true, tipo: 'Numérico', dica: 'Tipo de tributação' },
    { nome: 'Endereco', obrigatorio: true, tipo: 'Texto (máx 60)', dica: 'Logradouro' },
    { nome: 'Bairro', obrigatorio: true, tipo: 'Texto (máx 60)', dica: 'Bairro' },
    { nome: 'Municipio', obrigatorio: true, tipo: 'Texto (máx 60)', dica: 'Cidade' },
    { nome: 'Cep', obrigatorio: true, tipo: 'Numérico', dica: 'Apenas dígitos' },
    { nome: 'Estado', obrigatorio: true, tipo: 'Texto (2)', dica: 'Sigla UF' },
    { nome: 'Numero', obrigatorio: true, tipo: 'Texto (máx 15)', dica: 'Número do endereço' },
    { nome: 'Complemento', obrigatorio: false, tipo: 'Texto (máx 60)', dica: 'Complemento' },
    { nome: 'DDD', obrigatorio: false, tipo: 'Texto (máx 4)', dica: 'DDD do telefone' },
    { nome: 'Numero Tel', obrigatorio: false, tipo: 'Numérico', dica: 'Número do telefone' },
    { nome: 'Nome Contato', obrigatorio: false, tipo: 'Texto (máx 30)', dica: 'Nome do contato' },
    { nome: 'Cargo', obrigatorio: false, tipo: 'Texto (máx 20)', dica: 'Cargo do contato' },
    { nome: 'Email Contato', obrigatorio: false, tipo: 'Texto (máx 50)', dica: 'E-mail do contato' },
    { nome: 'DDD_2', obrigatorio: false, tipo: 'Texto (máx 4)', dica: 'DDD do celular' },
    { nome: 'Numero_2', obrigatorio: false, tipo: 'Numérico', dica: 'Número do celular' },
    { nome: 'Cód Vendedor', obrigatorio: true, tipo: 'Texto (máx 8)', dica: 'Código do vendedor' },
    { nome: 'Ativo', obrigatorio: true, tipo: 'Booleano (0/1)', dica: '1 = Ativo | 0 = Inativo' }
];

// ============================================
// CONFIGURAÇÃO DE CAMPOS QUE PODEM SER MAPEADOS
// Estes campos, quando mapeados, não precisam de valor padrão
// ============================================
export const camposConfiguraveis = [
    { campo: 'Segmento', default: '', label: 'Segmento *', maxlength: 4 },
    { campo: 'Cód Tab Preço', default: '', label: 'Cód Tab Preço *', maxlength: 8 },
    { 
        campo: 'Form De Pgto', 
        default: 'DP', 
        label: 'Forma de Pagamento *', 
        maxlength: 2, 
        tipo: 'select',
        opcoes: [
            { valor: 'DP', texto: 'DP - Boleto' },
            { valor: 'CA', texto: 'CA - Carteira' },
            { valor: 'DC', texto: 'DC - Depósito' }
        ]
    },
    { campo: 'Condição De Pgto', default: '', label: 'Condição de Pagamento', maxlength: 10 },
    { campo: 'Cód Vendedor', default: '', label: 'Cód Vendedor *', maxlength: 8 },
    { campo: 'Cód Tipo tributação', default: '', label: 'Cód Tipo Tributação *', maxlength: 5 },
    { campo: 'Cód Grupo de Cliente', default: '', label: 'Cód Grupo de Cliente', maxlength: 10 },
    { campo: 'Cód Rota', default: '', label: 'Cód Rota', maxlength: 8 },
    { campo: 'Banco', default: '', label: 'Banco', maxlength: 10 },
    { campo: 'Agência', default: '', label: 'Agência', maxlength: 8 },
    { campo: 'Conta', default: '', label: 'Conta', maxlength: 10 },
    { campo: 'Cargo', default: '', label: 'Cargo Contato', maxlength: 20 }
];

// Regras de mapeamento automático
export const regrasMapeamento = {
    'Cód Cliente': ['código', 'codigo', 'cod', 'cod_cliente', 'id', 'cód cliente', 'cod. cliente'],
    'Nome': ['nome', 'razão social', 'razao social', 'nome cliente', 'razão'],
    'Nome Fantasia': ['fantasia', 'nome fantasia', 'nome comercial'],
    'Tipo de Pessoa': ['tipo pessoa', 'tipo de pessoa', 'tipo_cliente', 'tipo'],
    'CNPJ/CPF': ['cnpj', 'cpf', 'cnpj/cpf', 'documento', 'cnpj / cpf', 'cnpj_cpf'],
    'Inscrição': ['ie', 'rg', 'inscrição', 'ie / rg', 'ie/rg', 'inscricao'],
    'Segmento': ['segmento', 'seg'],
    'Data de Cadastro': ['cliente desde', 'data cadastro', 'data de cadastro', 'dt cadastro'],
    'Email': ['e-mail', 'email', 'mail', 'e-mail para envio nfe'],
    'Site': ['web site', 'website', 'site'],
    'Endereco': ['endereço', 'endereco', 'logradouro', 'rua', 'av', 'avenida'],
    'Bairro': ['bairro'],
    'Municipio': ['cidade', 'município', 'municipio'],
    'Cep': ['cep'],
    'Estado': ['uf', 'estado', 'sigla'],
    'Numero': ['número', 'numero', 'num', 'nº'],
    'Complemento': ['complemento'],
    'DDD': ['fone', 'telefone', 'tel', 'phone'],
    'Numero Tel': ['fone', 'telefone', 'tel'],
    'DDD_2': ['celular', 'cel', 'mobile'],
    'Numero_2': ['celular', 'cel'],
    'Nome Contato': ['contato', 'contatos', 'responsável', 'responsavel'],
    'Cód Vendedor': ['vendedor', 'representante', 'cod vendedor', 'cód vendedor', 'cod. vendedor'],
    'Condição De Pgto': ['condição de pagamento', 'condicao de pagamento', 'prazo pagamento', 'cond pgto'],
    'Limite de Crédito': ['limite de crédito', 'limite de credito', 'limite'],
    'Ativo': ['situação', 'situacao', 'status', 'ativo'],
    'Cód Tipo tributação': ['regime tributário', 'regime tributario', 'tributacao']
};
