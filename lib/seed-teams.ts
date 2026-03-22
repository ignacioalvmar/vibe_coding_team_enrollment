/** Single source of truth for default coastal teams (seed + admin seed button). */
export type SeedTeam = {
  name: string;
  description: string | null;
  region: string;
  vibe: string;
  accent: string;
  imageUrl: string;
  nameOptions: string[];
  capacity: number;
  sortOrder: number;
};

export const COASTAL_SEED_TEAMS: SeedTeam[] = [
  {
    name: "Malibu Melodic",
    description: null,
    region: "California",
    vibe: "Retro/Chill",
    accent: "#ec4899",
    imageUrl:
      "https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?auto=format&fit=crop&q=80&w=800",
    nameOptions: ["Malibu Melodic", "Venice Vaporwave", "Laguna Lo-Fi"],
    capacity: 3,
    sortOrder: 10,
  },
  {
    name: "Ibiza Disco",
    description: null,
    region: "Mediterranean",
    vibe: "Euro-Chic",
    accent: "#0ea5e9",
    imageUrl:
      "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=80&w=800",
    nameOptions: ["Ibiza Disco", "Mykonos Minimal", "Amalfi Ambient"],
    capacity: 3,
    sortOrder: 20,
  },
  {
    name: "Ipanema Bossa",
    description: null,
    region: "Tropics",
    vibe: "High Energy",
    accent: "#22c55e",
    imageUrl:
      "https://images.unsplash.com/photo-1483683804023-6ccdb62f86ef?auto=format&fit=crop&q=80&w=800",
    nameOptions: ["Ipanema Bossa", "Copacabana Chip", "Grace Bay Garage"],
    capacity: 3,
    sortOrder: 30,
  },
  {
    name: "Okinawa Pop",
    description: null,
    region: "Asia",
    vibe: "Tech-Forward",
    accent: "#a855f7",
    imageUrl:
      "https://images.unsplash.com/photo-1534001265532-393289eb8ed3?auto=format&fit=crop&q=80&w=800",
    nameOptions: ["Okinawa Pop", "Haeundae House", "Sentosa Synth"],
    capacity: 3,
    sortOrder: 40,
  },
  {
    name: "Bondi Boom-Bap",
    description: null,
    region: "Aussie",
    vibe: "Raw/Steady",
    accent: "#f97316",
    imageUrl:
      "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&q=80&w=800",
    nameOptions: ["Bondi Boom-Bap", "Byron Bluegrass", "Manly Mod-Rock"],
    capacity: 3,
    sortOrder: 50,
  },
  {
    name: "Bora Bora Bass",
    description: null,
    region: "Islands",
    vibe: "Atmospheric",
    accent: "#14b8a6",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800",
    nameOptions: ["Bora Bora Bass", "Waikiki Wave", "Fiji Folk-Step"],
    capacity: 3,
    sortOrder: 60,
  },
  {
    name: "Reykjavik Techno",
    description: null,
    region: "Nordic",
    vibe: "Sleek/Moody",
    accent: "#64748b",
    imageUrl:
      "https://images.unsplash.com/photo-1529963183134-61a90db47eaf?auto=format&fit=crop&q=80&w=800",
    nameOptions: ["Reykjavik Techno", "Skagen Soul", "Lofoten Lullaby"],
    capacity: 3,
    sortOrder: 70,
  },
];
