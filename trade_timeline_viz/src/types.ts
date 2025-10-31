export type TTariff = {
    tariff_action: string;
    date: Date;
    chinese_tariffs_row: number;
    chinese_tariffs_us: number;
    us_tariffs_chinese: number;
    us_tariffs_row: number;
}

export type TPMI = {
    date: Date;
    pmi: number;
    employment?: number;
    price?: number;
    exportOrders?: number;
}

export type TTEU = {
    date: Date;
    longBeach: number;
    losAngeles: number;
    nyNj: number;
}