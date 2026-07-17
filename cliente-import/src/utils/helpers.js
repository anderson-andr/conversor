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
    if (v instanceof Date) {
        const day = String(v.getDate()).padStart(2, '0');
        const month = String(v.getMonth() + 1).padStart(2, '0');
        const year = v.getFullYear();
        return `${day}/${month}/${year}`;
    }
    const s = String(v).trim();
    const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match) {
        return s;
    }
    return '';
}

export function mapearAtivo(v) {
    const s = String(v || '').toLowerCase();
    if (s === 'sim' || s === 's' || s === '1' || s === 'true') return 1;
    return 0;
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
