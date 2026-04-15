import { redirect } from "next/navigation";

export default function FavoritesPage() {
  redirect("/trails?view=favorites");
}