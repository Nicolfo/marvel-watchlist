import type { Metadata } from "next";
import { WatchlistManager } from "@/components/watchlist-manager";

export const metadata: Metadata = {
  title: "My watchlist",
  description: "Your progress through the Marvel catalog, stored in your browser.",
};

export default function WatchlistPage() {
  return <WatchlistManager />;
}
