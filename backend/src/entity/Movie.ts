import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/* ---------- типы ---------- */
export type MovieKind =
  | 'film' | 'cartoon' | 'series' | 'cartoon_series'
  | 'show' | 'anime' | 'anime_series';

export type MovieStatus = 'watched' | 'watchlist';

/* ---------- модель ---------- */
@Entity({ name: 'movies' })
export class Movie {
  @PrimaryGeneratedColumn()
  id!: number;

  /* базовые данные --------------------------------------------------- */
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({
    type: 'enum',
    enum: [
      'film', 'cartoon', 'series', 'cartoon_series',
      'show', 'anime', 'anime_series',
    ],
  })
  kind!: MovieKind;

  @Column({ type: 'enum', enum: ['watched', 'watchlist'] })
  status!: MovieStatus;

  /* новинки: год, описание, постер ---------------------------------- */
  @Column({ type: 'int',  nullable: true }) year!: number  | null;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ type: 'text', nullable: true }) cover_url!: string | null;

  /* личная оценка ---------------------------------------------------- */
  @Column({ type: 'numeric', precision: 3, scale: 1, nullable: true })
  personal_rating!: number | null;

  /* IMDb ------------------------------------------------------------- */
  @Column({ type: 'text',    nullable: true }) imdb_url!: string | null;
  @Column({ type: 'numeric', precision: 3, scale: 1, nullable: true })
  imdb_rating!: number | null;
  @Column({ type: 'int', nullable: true }) imdb_votes!: number | null;

  /* Кинопоиск -------------------------------------------------------- */
  @Column({ type: 'text',    nullable: true }) kp_url!: string | null;
  @Column({ type: 'numeric', precision: 3, scale: 1, nullable: true })
  kp_rating!: number | null;
  @Column({ type: 'int', nullable: true }) kp_votes!: number | null;

  /* MyShows ---------------------------------------------------------- */
  @Column({ type: 'text',    nullable: true }) ms_url!: string | null;
  @Column({ type: 'numeric', precision: 3, scale: 1, nullable: true })
  ms_rating!: number | null;
  @Column({ type: 'int', nullable: true }) ms_votes!: number | null;

  /* Rotten Tomatoes -------------------------------------------------- */
  @Column({ type: 'text', nullable: true })
  rt_url!: string | null;

  /** «Tomatometer» — критики */
  @Column({ type: 'numeric', precision: 3, scale: 1, nullable: true })
  rt_critics_rating!: number | null;
  @Column({ type: 'int', nullable: true })
  rt_critics_votes!: number | null;

  /** «Audience score» — зрители */
  @Column({ type: 'numeric', precision: 3, scale: 1, nullable: true })
  rt_audience_rating!: number | null;
  @Column({ type: 'int', nullable: true })
  rt_audience_votes!: number | null;

  /* Metacritic ------------------------------------------------------ */
  @Column({ type: 'text', nullable: true }) mc_url!: string | null;

  // критики (Metascore /100 → /10)
  @Column({ type: 'numeric', precision: 3, scale: 1, nullable: true })
  mc_rating!: number | null;
  @Column({ type: 'int', nullable: true })
  mc_reviews!: number | null;

  // юзеры
  @Column({ type: 'numeric', precision: 3, scale: 1, nullable: true })
  mc_user_rating!: number | null;
  @Column({ type: 'int', nullable: true })
  mc_user_votes!: number | null;

  /* World-Art ───────────────────────────────────────── */
  @Column({ type:'text',    nullable:true }) wa_url  !: string | null;
  @Column({ type:'numeric', precision:3,scale:1, nullable:true })
          wa_rating      !: number | null;   // «Средний балл»  /10
  @Column({ type:'int',    nullable:true })
          wa_votes       !: number | null;   // «Проголосовало»

  /* timestamps ------------------------------------------------------- */
  @CreateDateColumn() created_at!: Date;
  @UpdateDateColumn() updated_at!: Date;
}
