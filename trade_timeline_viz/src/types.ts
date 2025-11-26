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
    longBeach: number | null;
    losAngeles: number | null;
    nyNj: number | null;
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

export type TradeBalance = {
  date: string;
  year: number;
  quarter: number;
  balance: number; // In hundreds of millions of dollars
};

export type TimelineEvent = {
  date: Date;
  country: string;
  category: string;
  description: string;
  link: string;
};

export type TimelineData = {
  date: Date;
  tariff_action: string;
  chinese_tariffs_row: number;
  chinese_tariffs_us: number;
  us_tariffs_chinese: number;
  us_tariffs_row: number;
  country: string;
  links: string;
  long_beach_teu: number;
  ca_los_angeles_teu: number;
  ca_ny_nj_teu: number;
  ism_manufacturing_pmi: number;
};