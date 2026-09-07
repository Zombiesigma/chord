# Chordbook Web

Website chord/lyrics yang membaca Firestore yang sama dengan aplikasi Android.

## 1. Install

```bash
npm install
```

## 2. Environment

Salin `.env.local.example` menjadi `.env.local`.

Konfigurasi Firebase sudah disiapkan untuk project `iot-project-605b3`.

## 3. Firestore

Website menganggap koleksi:

```text
songs/{documentId}
```

dengan field yang sama seperti aplikasi:

- title
- artist
- slug
- lyricsWithChords
- uniqueChords
- coverImageUrl
- isPublished
- bpm
- capo
- originalKey
- tuning
- youtubeUrl
- spotifyTrackUrl
- albumId
- albumName
- genre
- dll.

Hanya `isPublished == true` yang ditampilkan.

## 4. Format chord

Parser viewer mengharapkan chord berada di dalam tanda kurung siku:

```text
[Verse]
[Bm]I was walking...
[G]Down the street...

[Chorus]
[A]...
[E]...
```

Jika data aplikasi saat ini menggunakan format lain, parser dapat disesuaikan tanpa mengubah database.

## 5. Run

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Catatan Firestore index

Query halaman utama menggunakan:

- `isPublished == true`
- `orderBy(updatedAt, desc)`

Jika Firebase meminta composite index, ikuti link index yang diberikan Firebase Console dan buat index tersebut.

## Security

Firebase Web API key bukan credential admin. Jangan pernah memasukkan service-account private key ke website.

Tetap gunakan Firestore Security Rules untuk memastikan publik hanya dapat membaca dokumen yang memang boleh dibaca.
