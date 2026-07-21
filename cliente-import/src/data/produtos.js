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

const camposObrigatorios = new Set(['Cod Produto', 'Descrição', 'Unid Estoque']);
const camposNumericos = new Set([
  'Fator Un Estoque', 'Fator Un Compra', 'Peso Bruto', 'Peso Liq',
  'Fator Un Vda', 'Fator Un Vda 2', 'Fator Un Vda 3'
]);

export const camposDestinoProdutos = nomesProdutos.map(nome => ({
  nome,
  obrigatorio: camposObrigatorios.has(nome),
  tipo: nome === 'Data Cadastro' ? 'Data' : camposNumericos.has(nome) ? 'Numérico' : 'Texto',
  dica: nome === 'Cod Produto' ? 'Código único do produto' : ''
}));

export const camposConfiguraveisProdutos = [
  { campo: 'Cod Linha', default: '', label: 'Código da Linha', maxlength: 20 },
  { campo: 'Cod Fabricante', default: '', label: 'Código do Fabricante', maxlength: 20 },
  { campo: 'Unid Estoque', default: '', label: 'Unidade de Estoque *', maxlength: 6 },
  { campo: 'Unid Compra', default: '', label: 'Unidade de Compra', maxlength: 6 },
  { campo: 'Unid Venda', default: '', label: 'Unidade de Venda', maxlength: 6 },
  { campo: 'Unid Formadora Preco', default: '', label: 'Unidade Formadora de Preço', maxlength: 6 },
  { campo: 'Unid Tributavel', default: '', label: 'Unidade Tributável', maxlength: 6 },
  { campo: 'Tipo Fiscal', default: '', label: 'Tipo Fiscal', maxlength: 10 },
  {
    campo: 'Venda',
    default: '',
    label: 'Permite Venda',
    tipo: 'select',
    opcoes: [{ valor: '1', texto: 'Sim' }, { valor: '0', texto: 'Não' }]
  },
  {
    campo: 'Compra',
    default: '',
    label: 'Permite Compra',
    tipo: 'select',
    opcoes: [{ valor: '1', texto: 'Sim' }, { valor: '0', texto: 'Não' }]
  },
  {
    campo: 'Ativo',
    default: '',
    label: 'Ativo',
    tipo: 'select',
    opcoes: [{ valor: '1', texto: 'Sim' }, { valor: '0', texto: 'Não' }]
  },
  {
    campo: 'Controla Lote',
    default: '',
    label: 'Controla Lote',
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
