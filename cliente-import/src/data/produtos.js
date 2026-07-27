const nomesProdutos = [
  'Cod Produto', 'Descrição', 'Desc Resumida', 'Cod Linha', 'Cod Fabricante',
  'Unid Estoque', 'Fator Un Estoque', 'Unid Compra', 'Fator Un Compra',
  'Peso Bruto', 'Peso Liq', 'Class Fiscal', 'Data Cadastro', 'Cod Prod No Fabric',
  'Desc Prod No Fabric', 'Cod Substancia', 'Tipo Cod de Barra', 'Codigo de Barra',
  'Tipo Cod de Barra Compra', 'Codigo de Barra Compra', 'NCM', 'Tipo Fiscal',
  'Unid Venda', 'Fator Un Vda', 'Unid Venda 2', 'Fator Un Vda 2', 'Unid Venda 3',
  'Fator Un Vda 3', 'Unid Formadora Preco', 'Unid Tributavel', 'Venda', 'Compra',
  'Ativo', 'Controla Lote'
];

const camposObrigatorios = new Set([
  'Cod Produto', 'Descrição', 'Desc Resumida', 'Cod Linha', 'Cod Fabricante',
  'Unid Estoque', 'Fator Un Estoque', 'Unid Compra', 'Fator Un Compra',
  'Peso Bruto', 'Peso Liq', 'Class Fiscal', 'Data Cadastro', 'NCM',
  'Unid Venda', 'Fator Un Vda', 'Unid Formadora Preco', 'Unid Tributavel',
  'Compra', 'Ativo', 'Controla Lote'
]);
const camposNumericos = new Set([
  'Fator Un Estoque', 'Fator Un Compra', 'Peso Bruto', 'Peso Liq',
  'Fator Un Vda', 'Fator Un Vda 2', 'Fator Un Vda 3'
]);
const camposBooleanos = new Set(['Venda', 'Compra', 'Ativo', 'Controla Lote']);

export const limitesTextoProdutos = {
  'Descrição': 120,
  'Desc Resumida': 20,
  'Cod Linha': 4,
  'Cod Fabricante': 6,
  'Unid Estoque': 2,
  'Unid Compra': 2,
  'Class Fiscal': 2,
  'Cod Prod No Fabric': 30,
  'Desc Prod No Fabric': 60,
  'Cod Substancia': 10,
  'Tipo Cod de Barra': 5,
  'Codigo de Barra': 14,
  'Tipo Cod de Barra Compra': 5,
  'Codigo de Barra Compra': 14,
  'NCM': 10,
  'Tipo Fiscal': 2,
  'Unid Venda': 2,
  'Unid Venda 2': 2,
  'Unid Venda 3': 2,
  'Unid Formadora Preco': 2,
  'Unid Tributavel': 2
};

const dicasProdutos = {
  'Cod Produto': 'Numérico',
  'Descrição': 'Texto (máx. 120)',
  'Desc Resumida': 'Texto (máx. 20)',
  'Cod Linha': 'Texto (máx. 4) — deve estar cadastrada no ERP',
  'Cod Fabricante': 'Texto (máx. 6) — deve estar cadastrado no ERP',
  'Unid Estoque': 'Texto (máx. 2) — menor unidade do produto',
  'Fator Un Estoque': 'Numérico — informe 1 caso seja desconhecido',
  'Unid Compra': 'Texto (máx. 2) — maior unidade do produto',
  'Fator Un Compra': 'Numérico — conversão entre estoque e compra',
  'Peso Bruto': 'Numérico — peso em kg da unidade de estoque',
  'Peso Liq': 'Numérico — peso em kg da unidade de estoque',
  'Class Fiscal': 'Texto (máx. 2)',
  'Data Cadastro': 'Data no formato dd/mm/aaaa',
  'NCM': 'Texto (máx. 10), com pontuação, exemplo: 1111.22.33',
  'Unid Venda': 'Texto (máx. 2), geralmente igual à unidade de estoque',
  'Fator Un Vda': 'Numérico',
  'Unid Formadora Preco': 'Texto (máx. 2)',
  'Unid Tributavel': 'Texto (máx. 2)',
  'Compra': 'Booleano (0/1)',
  'Ativo': 'Booleano (0/1) — 1 ativo, 0 inativo',
  'Controla Lote': 'Booleano (0/1)'
};

export const camposDestinoProdutos = nomesProdutos.map(nome => ({
  nome,
  obrigatorio: camposObrigatorios.has(nome),
  tipo: nome === 'Data Cadastro'
    ? 'Data'
    : camposBooleanos.has(nome)
      ? 'Booleano'
      : camposNumericos.has(nome)
        ? 'Numérico'
        : 'Texto',
  dica: dicasProdutos[nome] || ''
}));

export const camposConfiguraveisProdutos = [
  { campo: 'Descrição', default: '', label: 'Descrição *', maxlength: 120 },
  { campo: 'Desc Resumida', default: '', label: 'Descrição Resumida *', maxlength: 20 },
  { campo: 'Cod Linha', default: '', label: 'Código da Linha *', maxlength: 4 },
  { campo: 'Cod Fabricante', default: '', label: 'Código do Fabricante *', maxlength: 6 },
  { campo: 'Unid Estoque', default: '', label: 'Unidade de Estoque *', maxlength: 2 },
  { campo: 'Fator Un Estoque', default: '', label: 'Fator da Unidade de Estoque *' },
  { campo: 'Unid Compra', default: '', label: 'Unidade de Compra *', maxlength: 2 },
  { campo: 'Fator Un Compra', default: '', label: 'Fator da Unidade de Compra *' },
  { campo: 'Peso Bruto', default: '', label: 'Peso Bruto (kg) *' },
  { campo: 'Peso Liq', default: '', label: 'Peso Líquido (kg) *' },
  { campo: 'Class Fiscal', default: '', label: 'Classificação Fiscal *', maxlength: 2 },
  { campo: 'Data Cadastro', default: '', label: 'Data de Cadastro *', placeholder: 'dd/mm/aaaa', maxlength: 10 },
  { campo: 'NCM', default: '', label: 'NCM *', placeholder: '1111.22.33', maxlength: 10 },
  { campo: 'Unid Venda', default: '', label: 'Unidade de Venda *', maxlength: 2 },
  { campo: 'Fator Un Vda', default: '', label: 'Fator da Unidade de Venda *' },
  { campo: 'Unid Formadora Preco', default: '', label: 'Unidade Formadora de Preço *', maxlength: 2 },
  { campo: 'Unid Tributavel', default: '', label: 'Unidade Tributável *', maxlength: 2 },
  {
    campo: 'Compra',
    default: '',
    label: 'Permite Compra *',
    tipo: 'select',
    opcoes: [{ valor: '1', texto: 'Sim' }, { valor: '0', texto: 'Não' }]
  },
  {
    campo: 'Ativo',
    default: '',
    label: 'Ativo *',
    tipo: 'select',
    opcoes: [{ valor: '1', texto: 'Sim' }, { valor: '0', texto: 'Não' }]
  },
  {
    campo: 'Controla Lote',
    default: '',
    label: 'Controla Lote *',
    tipo: 'select',
    opcoes: [{ valor: '1', texto: 'Sim' }, { valor: '0', texto: 'Não' }]
  }
];

export const regrasMapeamentoProdutos = {
  'Cod Produto': ['cód produto', 'cod produto', 'código produto', 'codigo produto', 'sku', 'referência', 'referencia', 'id produto'],
  'Descrição': ['descrição', 'descricao', 'nome produto', 'produto'],
  'Desc Resumida': ['descrição resumida', 'descricao resumida', 'desc resumida'],
  'Cod Linha': ['cód linha', 'cod linha', 'linha'],
  'Cod Fabricante': ['cód fabricante', 'cod fabricante', 'fabricante'],
  'Unid Estoque': ['unidade estoque', 'unid estoque', 'unidade'],
  'Fator Un Estoque': ['fator estoque', 'fator un estoque'],
  'Unid Compra': ['unidade compra', 'unid compra'],
  'Fator Un Compra': ['fator compra', 'fator un compra'],
  'Peso Bruto': ['peso bruto'],
  'Peso Liq': ['peso líquido', 'peso liquido', 'peso liq'],
  'Class Fiscal': ['classificação fiscal', 'classificacao fiscal', 'class fiscal'],
  'Data Cadastro': ['data cadastro', 'data de cadastro'],
  'Cod Prod No Fabric': ['cód produto fabricante', 'cod produto fabricante'],
  'Desc Prod No Fabric': ['descrição fabricante', 'descricao fabricante'],
  'Cod Substancia': ['cód substancia', 'cod substancia'],
  'Tipo Cod de Barra': ['tipo código de barra', 'tipo codigo de barra'],
  'Codigo de Barra': ['código de barra', 'codigo de barra', 'ean', 'gtin'],
  'Tipo Cod de Barra Compra': ['tipo código de barra compra', 'tipo codigo de barra compra'],
  'Codigo de Barra Compra': ['código de barra compra', 'codigo de barra compra'],
  'NCM': ['ncm'],
  'Tipo Fiscal': ['tipo fiscal'],
  'Unid Venda': ['unidade venda', 'unid venda'],
  'Fator Un Vda': ['fator venda', 'fator un vda'],
  'Unid Venda 2': ['unidade venda 2', 'unid venda 2'],
  'Fator Un Vda 2': ['fator venda 2', 'fator un vda 2'],
  'Unid Venda 3': ['unidade venda 3', 'unid venda 3'],
  'Fator Un Vda 3': ['fator venda 3', 'fator un vda 3'],
  'Unid Formadora Preco': ['unidade formadora preço', 'unidade formadora preco'],
  'Unid Tributavel': ['unidade tributável', 'unidade tributavel'],
  'Venda': ['venda', 'permite venda'],
  'Compra': ['compra', 'permite compra'],
  'Ativo': ['ativo', 'status'],
  'Controla Lote': ['controla lote', 'lote']
};
