function StatsCard({ title, value, icon }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-telegram-hint text-sm">{title}</div>
          <div className="text-xl font-bold mt-1">{value}</div>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}

export default StatsCard;