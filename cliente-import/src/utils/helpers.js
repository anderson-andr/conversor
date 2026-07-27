// Funções utilitárias

export function apenasDigitos(v) {
    return String(v || '').replace(/\D/g, '');
}

function converterIdentificadorParaTexto(v) {
    if (typeof v === 'number' && Number.isFinite(v)) {
        return Math.trunc(v).toFixed(0);
    }

    const texto = String(v ?? '').trim();
    if (/^\d+(?:[.,]0+)?$/.test(texto)) {
        return texto.replace(/[.,]0+$/, '');
    }
    if (/^\d+(?:[.,]\d+)?e[+-]?\d+$/i.test(texto)) {
        const numero = Number(texto.replace(',', '.'));
        if (Number.isSafeInteger(numero)) return numero.toFixed(0);
    }
    return texto;
}

export function normalizarCodigo(v) {
    return converterIdentificadorParaTexto(v).replace(/\s/g, '');
}

export function limparCnpjCpf(v, tipoPessoa = '') {
    const d = apenasDigitos(converterIdentificadorParaTexto(v)).slice(0, 14);
    const tipo = String(tipoPessoa || '').trim().toUpperCase();

    if (!d) return '';
    if (tipo === 'F') return d.slice(-11).padStart(11, '0');
    if (tipo === 'J') return d.padStart(14, '0');
    return d.length <= 11 ? d.padStart(11, '0') : d.padStart(14, '0');
}

export function validarCnpjCpf(v) {
    const documento = apenasDigitos(v);

    if (![11, 14].includes(documento.length) || /^(\d)\1+$/.test(documento)) {
        return false;
    }

    const calcularDigito = (base, pesos) => {
        const soma = base
            .split('')
            .reduce((total, digito, indice) => total + Number(digito) * pesos[indice], 0);
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };

    if (documento.length === 11) {
        const primeiro = calcularDigito(documento.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
        const segundo = calcularDigito(documento.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
        return documento.endsWith(`${primeiro}${segundo}`);
    }

    const primeiro = calcularDigito(documento.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const segundo = calcularDigito(documento.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return documento.endsWith(`${primeiro}${segundo}`);
}

export function limparCep(v) {
    return apenasDigitos(v).slice(0, 8);
}

export function separarTelefone(tel, dddAtual = '') {
    const telefone = apenasDigitos(tel);
    const dddInformado = apenasDigitos(dddAtual);

    // Quando telefone e DDD vieram da mesma coluna, o telefone completo
    // prevalece e os dois primeiros dígitos são separados.
    if (telefone.length >= 10) {
        return {
            ddd: telefone.slice(0, 2),
            numero: telefone.slice(2, 11)
        };
    }

    // Se apenas o campo mapeado como DDD contém o telefone completo,
    // também realiza a separação.
    if (!telefone && dddInformado.length >= 10) {
        return {
            ddd: dddInformado.slice(0, 2),
            numero: dddInformado.slice(2, 11)
        };
    }

    // Preserva um DDD que esteja em uma coluna própria.
    if (dddInformado.length === 2) {
        return {
            ddd: dddInformado,
            numero: telefone.slice(0, 9)
        };
    }

    const d = telefone || dddInformado;
    return {
        ddd: d.slice(0, 2),
        numero: d.slice(2, 11)
    };
}

export function separarEnderecoNumero(endereco, numeroAtual = '') {
    const enderecoLimpo = String(endereco ?? '').trim();
    const numeroLimpo = String(numeroAtual ?? '').trim();

    if (!enderecoLimpo || numeroLimpo) {
        return { endereco: enderecoLimpo, numero: numeroLimpo };
    }

    // Reconhece números no fim do logradouro, inclusive após vírgula sem espaço,
    // com ponto de milhar ou com um identificador complementar.
    const partes = enderecoLimpo.match(
        /^(.*?)(?:\s*,\s*|\s+)(?:N(?:[º°O.]|ÚMERO)?\s*)?(\d[\d.]*)(?:\s*-\s*([A-ZÀ-Ü.]+))?\s*$/i
    );

    if (!partes || !partes[1].trim()) {
        return { endereco: enderecoLimpo, numero: 'S/N' };
    }

    const numeroBase = /^\d{1,3}(?:\.\d{3})+$/.test(partes[2])
        ? partes[2].replace(/\./g, '')
        : partes[2];
    const sufixo = partes[3]?.replace(/\.+$/, '');

    return {
        endereco: partes[1].trim().replace(/,\s*$/, ''),
        numero: sufixo ? `${numeroBase}-${sufixo}` : numeroBase
    };
}

export function mapearTipoPessoa(v) {
    const s = String(v || '').toUpperCase();
    if (s.includes('J') || s.includes('JURÍDICA') || s.includes('JURIDICA')) return 'J';
    if (s.includes('F') || s.includes('FÍSICA') || s.includes('FISICA')) return 'F';
    return '';
}

export function mapearTipoInscricao(row) {
    const ie = String(row['Inscrição'] || '').trim();
    const ieUpper = ie.toUpperCase();
    if (!ie || ieUpper === 'ISENTO' || ieUpper === 'I') return 'I';
    return 'E';
}

export function parseData(v) {
    if (!v) return '';

    const formatarData = (data, usarUtc = false) => {
        const day = String(usarUtc ? data.getUTCDate() : data.getDate()).padStart(2, '0');
        const month = String((usarUtc ? data.getUTCMonth() : data.getMonth()) + 1).padStart(2, '0');
        const year = usarUtc ? data.getUTCFullYear() : data.getFullYear();
        return `${day}/${month}/${year}`;
    };

    if (v instanceof Date && !Number.isNaN(v.getTime())) {
        return formatarData(v);
    }

    // Datas do Excel podem chegar como número serial quando a célula não é lida como Date.
    const numeroSerial = typeof v === 'number' ? v : (/^\d+(?:\.\d+)?$/.test(String(v).trim()) ? Number(v) : null);
    if (numeroSerial !== null && Number.isFinite(numeroSerial) && numeroSerial > 0) {
        const dataExcel = new Date(Date.UTC(1899, 11, 30) + Math.floor(numeroSerial) * 86400000);
        return formatarData(dataExcel, true);
    }

    const s = String(v).trim();
    const dataBrasileira = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+.*)?$/);
    if (dataBrasileira) {
        const [, dia, mes, ano] = dataBrasileira;
        return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano.length === 2 ? `20${ano}` : ano}`;
    }

    const dataIso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
    if (dataIso) {
        const [, ano, mes, dia] = dataIso;
        return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
    }

    return '';
}

export function mapearAtivo(v) {
    const s = String(v ?? '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    if (!s) return '';

    if (['1', 'sim', 's', 'true', 'ativo', 'a'].includes(s)) return 1;
    if (['0', 'nao', 'n', 'false', 'inativo', 'i'].includes(s)) return 0;

    if (s.includes('inativo')) return 0;
    if (s.includes('ativo')) return 1;

    return '';
}

export function normalizarTexto(t) {
    if (!t) return '';
    return String(t)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
}

export function detectarMapeamentoAutomatico(campoDestino, camposOrigem, regrasMapeamento) {
    const regras = regrasMapeamento[campoDestino];
    if (!regras) return '';
    
    for (const regra of regras) {
        const regraLower = regra.toLowerCase();
        for (const campoO of camposOrigem) {
            const campoLower = campoO.toLowerCase().trim();
            if (campoLower === regraLower || campoLower.includes(regraLower)) {
                return campoO;
            }
        }
    }
    return '';
}
