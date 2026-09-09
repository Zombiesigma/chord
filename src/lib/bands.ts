export async function getPublishedBands(): Promise<Band[]> {
  // ambil bands yang isPublished == true
}

export async function getBandBySlug(
  slug: string
): Promise<Band | null> {
  // ambil band berdasarkan slug
}

export async function getSongsByBand(
  bandId: string
): Promise<Song[]> {
  // ambil lagu berdasarkan bandId
}
