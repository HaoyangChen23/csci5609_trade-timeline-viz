export type TMovie = {
    num_votes: number;
    runtime_minutes:  number;
    genres: string[];
    year: Date;
    average_rating: number;
    tconst: string;
    title_type: string;
    primary_title: string;
    original_title: string;
}

export type TTariff = {
    tariff_action: string;
    date: Date;
    chinese_tariffs_row: number;
    chinese_tariffs_us: number;
    us_tariffs_chinese: number;
    us_tariffs_row: number;
}