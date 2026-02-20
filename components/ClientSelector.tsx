const ClientSelector: React.FC<ClientSelectorProps> = ({ clients, selectedClientId, onSelect, label = "Select Client" }) => {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider ml-1">
                {label}
            </label>
            <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors group-focus-within:text-primary text-neutral-500">
                    <span className="material-symbols-outlined text-lg">groups</span>
                </div>
                <select
                    value={selectedClientId}
                    onChange={(e) => onSelect(e.target.value)}
                    className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-primary/50 outline-none appearance-none transition-all hover:border-neutral-700 cursor-pointer"
                >
                    <option value="">-- No Client Selected --</option>
                    {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                            {client.first_name} {client.last_name}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                    <span className="material-symbols-outlined text-sm">expand_more</span>
                </div>
            </div>
        </div>
    );
};

export default ClientSelector;
