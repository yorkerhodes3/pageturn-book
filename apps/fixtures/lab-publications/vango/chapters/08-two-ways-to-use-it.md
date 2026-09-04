<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/vango.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 07. Two Ways to Use It {#two-ways-to-use-it}

**Guest mode.** The visitor taps past the sign-in screen. Stamps are held in the phone's own browser storage. Nothing is transmitted anywhere and no account exists. The record survives closing the application but is lost if the browser's data is cleared or the phone is replaced. For a visitor who does not want to hand over an email address in exchange for a souvenir, this is the whole application, working, at no cost in privacy.

**Account mode.** The visitor registers with an email address, a password of at least eight characters, and optionally a name. The password is not stored. It is passed through a one-way scrambling process called hashing, using a deliberately slow method known as bcrypt, so that a person who obtained a copy of the database could not read the passwords out of it. The visitor's session is then held by a signed token that expires after seven days.

**What the server stores.** The database holds two lists, and that is the entire extent of it. The server does not record where the visitor was, what device they used, or how long they looked at anything.

**Everything the server stores.**

| List | Fields held |
| --- | --- |
| People | Email address, hashed password, name, uploaded picture, membership date, passport number, and the moment the account was created |
| Stamps | Which person, which artwork code, and on what date |

**An important practical caveat.** The published demonstration on the public web cannot reach a server. The address of the server is written into the application as a local address on the developer's own machine. A visitor opening the public demonstration can therefore use guest mode fully, but registration and sign-in will not work. The account system is real, tested code, but it is at present only usable by someone running both halves of the application on their own computer.
