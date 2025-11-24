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

export type AutoIncome = {
  quarter: string;
  company: string;
  operatingIncome: number;
  tariffImpact: number;
};

export type TariffData = {
  Country_ISO3: string;
  Country: string;
  Development_Status: string;
  Current_tariff_total: number;
  Pre2025_tariff_total: number;
  Imports_total: number;
};