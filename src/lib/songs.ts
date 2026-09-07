import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  doc,
  getDoc
} from "firebase/firestore";
import { db } from "./firebase";
import type { Song } from "@/types/song";

const songsRef = collection(db, "songs");

export async function getPublishedSongs(): Promise<Song[]> {
  const q = query(
    songsRef,
    where("isPublished", "==", true),
    orderBy("updatedAt", "desc"),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Song, "id">) }));
}

export async function getSongBySlug(slug: string): Promise<Song | null> {
  const q = query(
    songsRef,
    where("slug", "==", slug),
    where("isPublished", "==", true),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Song, "id">) };
}

export async function getSongById(id: string): Promise<Song | null> {
  const snap = await getDoc(doc(db, "songs", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Song, "id">) };
}
