// Funções utilitárias

export function apenasDigitos(v) {
    return String(v || '').replace(/\D/g, '');
}

export function limparCnpjCpf(v) {
    const d = apenasDigitos(v);
    return d.slice(0, 14);
}

export function limparCep(v) {
    return apenasDigitos(v).slice(0, 8);
}

export function separarTelefone(tel) {
    const d = apenasDigitos(tel);
    return {
        ddd: d.slice(0, 2),
        numero: d.slice(2, 11)
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
