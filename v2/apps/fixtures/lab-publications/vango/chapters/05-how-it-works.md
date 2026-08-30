<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/vango.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 04. How VANGO Works {#how-it-works}

The application has four moving parts: a catalogue of artworks, a way of capturing a code, a book in which stamps are stored, and an optional account.

**The catalogue.** The catalogue is a fixed list held inside the application itself. Each entry consists of a code and three pieces of descriptive text: the title of the work, the artist, and the venue.

The seven current entries are:

- Chromatic Drift
- Fault Lines
- Hollow Choir
- Echo Garden
- Voidwalk
- Bura Ceramics
- David

Because the catalogue is written into the application, a new artwork can only be added by editing the software and publishing it again. The README file documents how to do this. There is no facility for a gallery to register its own work without a developer.

**Capturing a code.** A visitor opens the add-stamp panel and chooses one of two methods. The first uses the phone's camera to read a QR code. The second is a text box in which the code is typed. A third route exists for institutions that would rather share a web link than print a barcode: a specially formed web address carries the code within it, and opening that link adds the stamp directly.

Before a code is looked up it is normalised, meaning it is converted into a single standard form. The application converts all letters to capitals and removes any spaces and hyphens. The practical effect is that a visitor who types "chroma-14", "CHROMA 14", or "Chroma14" gets the same result. This is a small decision with a large effect on how forgiving the tool feels to someone squinting at a label in a dim room.

If the code matches no catalogue entry, the visitor is told that no artwork is registered for that code. If it matches a work already in the passport, the visitor is told so rather than being given a duplicate.

**The book.** The passport is presented as a book that opens and whose pages turn. The first page inside the cover is the biography page. Each subsequent page holds exactly two stamps. A back page invites the visitor to collect another. When a new stamp is earned the book automatically turns to the page where it has landed, after a short animation showing the stamp being pressed.

**The account.** A visitor may register with an email address and password, or continue as a guest. The two paths are described in Section 7. The distinction matters because it determines where the visitor's record is kept and who else can see it.
