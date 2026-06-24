type BlackMarketStats = {
  item_id: string;
  quality: string;
  avg_price_7d: number;
  sold_7d: number;
};

type Props = {
  blackMarket: BlackMarketStats;
};

function formatNumber(value: number) {
  if (!value) return "-";
  return value.toLocaleString("pl-PL");
}

export default function BlackMarketStatsBox({ blackMarket }: Props) {
  return (
    <div className="metal-panel p-6 mb-6 border-yellow-500">
      <h3 className="text-2xl font-black text-yellow-300 mb-5">
        Black Market — ostatnie 7 dni
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="albion-input rounded-xl p-5">
          <p className="text-yellow-100/60 text-sm">Średnia cena</p>
          <p className="text-4xl font-black text-yellow-300">
            {formatNumber(blackMarket.avg_price_7d)}
          </p>
        </div>

        <div className="albion-input rounded-xl p-5">
          <p className="text-yellow-100/60 text-sm">Sprzedane sztuki</p>
          <p className="text-4xl font-black text-yellow-300">
            {formatNumber(blackMarket.sold_7d)}
          </p>
        </div>
      </div>
    </div>
  );
}
