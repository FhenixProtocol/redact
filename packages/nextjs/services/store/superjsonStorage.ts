import superjson from "superjson";

export const superjsonStorage = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    return superjson.parse(str) as unknown as ReturnType<typeof JSON.parse>;
  },
  setItem: (name: string, value: unknown) => {
    localStorage.setItem(name, superjson.stringify(value));
  },
  removeItem: (name: string) => localStorage.removeItem(name),
};
