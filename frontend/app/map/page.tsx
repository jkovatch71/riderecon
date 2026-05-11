import { redirect } from "next/navigation";

export default function MapPage() {
  redirect("/trails?view=map");
}