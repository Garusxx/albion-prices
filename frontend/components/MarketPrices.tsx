type Price = {
  item_id: string;
  city: string;
  sell_price_min: number;
  sell_price_min_date: string;
  buy_price_max: number;
  buy_price_max_date: string;
};

type Props = {
  prices: Price[];
};

const cityStyles: Record<string, string> = {
  Bridgewatch: "text-orange-400",
  Martlock: "text-blue-400",
  FortSterling: "text-slate-300",
  Lymhurst: "text-green-400",
  Thetford: "text-purple-400",
  Caerleon: "text-red-400",
  Brecilien: "text-pink-400",
};

function formatNumber(value: number) {
  if (!value) return "-";
  return value.toLocaleString("pl-PL");
}

function formatDate(date: string) {
  if (!date) return "-";
  return new Date(date).toLocaleString("pl-PL");
}

export default function MarketPrices({ prices }: Props) {
  return (
    <div className="metal-panel overflow-hidden">
      <table className="w-full">
        <thead className="bg-[#110d0a] text-yellow-100/60">
          <tr>
            <th className="p-4 text-left">Miasto</th>
            <th className="p-4 text-right">Sell min</th>
            <th className="p-4 text-right">Buy max</th>
            <th className="p-4 text-right">Aktualizacja</th>
          </tr>
        </thead>

        <tbody>
          {prices.map((price, index) => (
            <tr key={index} className="border-t border-[#6f5735]/60">
              <td className={`p-4 font-black ${cityStyles[price.city] || ""}`}>
                {price.city}
              </td>

              <td className="p-4 text-right font-bold">
                {formatNumber(price.sell_price_min)}
              </td>

              <td className="p-4 text-right font-bold">
                {formatNumber(price.buy_price_max)}
              </td>

              <td className="p-4 text-right text-yellow-100/50">
                {formatDate(
                  price.sell_price_min_date || price.buy_price_max_date,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
