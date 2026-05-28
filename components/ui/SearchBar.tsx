"use client";

const SEARCH_ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA3ElEQVR4nJ2TTRLBQBCFU9kKGz/nwREUd/GzIhdgzyH8XEPETSSUBcWnSKeqDUaSruqqqTdvXveb6XEcFUAD8IEAiCW3wASoO7YAenLgV0RAx3b4LsQl0AI8yed6LXu3DxGSttPKfUuHI+Ec3uyQeH5VtnpMuGknYw2GAjYzCLSFG2jwKKCXQaAs3FiDcQ6BinBPGtwVsBAWvcSNcIe/nnGQ4RkvQNXc7KpBWsnwlCT1IKUxB9xvIpFllK9ZROrqM52AM7B/egZqwMIQmf67N7OAa4hEuQSUyEw69B9xJ+OG5xv8YwAAAABJRU5ErkJggg==";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  className = "",
}: SearchBarProps) {
  return (
    <div
      className={`flex items-center bg-white border border-gray-200 rounded-full shadow-md overflow-hidden ${className}`}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSearch(value)}
        placeholder={placeholder}
        className="flex-1 px-5 py-3 text-sm outline-none bg-transparent text-gray-800 placeholder:text-gray-400 min-w-0"
      />
      <button
        onClick={() => onSearch(value)}
        className="flex items-center justify-center w-11 h-11 rounded-full m-1 flex-shrink-0 transition-opacity hover:opacity-90 active:opacity-80"
        style={{ backgroundColor: "var(--primary)" }}
        aria-label="Search"
      >
        <img
          src={SEARCH_ICON}
          width={16}
          height={16}
          alt=""
          style={{ filter: "brightness(0) invert(1)" }}
        />
      </button>
    </div>
  );
}
