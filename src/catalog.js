// Catalogue : une ligne par morceau, « Titre | Artiste ».
// Variantes acceptées séparées par « ~ » (la première est celle affichée).
// Les extraits de 30 s et pochettes sont retrouvés sur iTunes au moment de jouer (voir hub.js).

const RAW = {
  '80': `
Billie Jean | Michael Jackson
Like a Virgin | Madonna
Sweet Dreams ~ Sweet Dreams (Are Made of This) | Eurythmics
Africa | Toto
Take On Me | a-ha
Girls Just Want to Have Fun | Cyndi Lauper
Every Breath You Take | The Police ~ Police
Livin' on a Prayer | Bon Jovi
Don't Stop Believin' | Journey
Wake Me Up Before You Go-Go | Wham!
Careless Whisper | George Michael ~ Wham!
Footloose | Kenny Loggins
Eye of the Tiger | Survivor
Don't You (Forget About Me) | Simple Minds
Tainted Love | Soft Cell
Another One Bites the Dust | Queen
Purple Rain | Prince
Never Gonna Give You Up | Rick Astley
I Wanna Dance with Somebody | Whitney Houston
Total Eclipse of the Heart | Bonnie Tyler
Money for Nothing | Dire Straits
Jump | Van Halen
Smalltown Boy | Bronski Beat
Ella, elle l'a | France Gall
Femme libérée | Cookie Dingler
Les démons de minuit | Images
Voyage, voyage | Desireless
Joe le taxi | Vanessa Paradis
Toute première fois | Jeanne Mas
Tous les cris les S.O.S. | Daniel Balavoine
Partenaire particulier | Partenaire Particulier
Nuit de folie | Début de Soirée
Cendrillon | Téléphone
Sweet Child O' Mine | Guns N' Roses
`,
  '90': `
Wonderwall | Oasis
Smells Like Teen Spirit | Nirvana
Barbie Girl | Aqua
Freed from Desire | Gala
Macarena | Los del Río
...Baby One More Time ~ Baby One More Time | Britney Spears
Wannabe | Spice Girls
I Want It That Way | Backstreet Boys
What Is Love | Haddaway
Rhythm Is a Dancer | Snap!
Blue ~ Blue (Da Ba Dee) ~ Da Ba Dee | Eiffel 65
Losing My Religion | R.E.M. ~ REM
Zombie | The Cranberries ~ Cranberries
Torn | Natalie Imbruglia
No Scrubs | TLC
Gangsta's Paradise | Coolio
Mambo No. 5 ~ Mambo Number 5 | Lou Bega
Bitter Sweet Symphony | The Verve
Believe | Cher
Ice Ice Baby | Vanilla Ice
U Can't Touch This | MC Hammer
Black or White | Michael Jackson
Vogue | Madonna
Nothing Compares 2 U ~ Nothing Compares to You | Sinéad O'Connor
Tubthumping | Chumbawamba
Scatman ~ Scatman (Ski-Ba-Bop-Ba-Dop-Bop) | Scatman John
Foule sentimentale | Alain Souchon
Aïcha | Khaled
La tribu de Dana | Manau
Tomber la chemise | Zebda
Pour que tu m'aimes encore | Céline Dion
Désenchantée | Mylène Farmer
Il me dit que je suis belle | Patricia Kaas
Lucie | Pascal Obispo
Zen | Zazie
`,
  '2000': `
Hey Ya! | Outkast
Crazy in Love | Beyoncé
Toxic | Britney Spears
Hips Don't Lie | Shakira
Umbrella | Rihanna
Seven Nation Army | The White Stripes ~ White Stripes
Mr. Brightside | The Killers ~ Killers
In the End | Linkin Park
Without Me | Eminem
Yeah! | Usher
I Gotta Feeling | The Black Eyed Peas ~ Black Eyed Peas
Poker Face | Lady Gaga
Rehab | Amy Winehouse
Crazy | Gnarls Barkley
Since U Been Gone | Kelly Clarkson
Complicated | Avril Lavigne
Clocks | Coldplay
Feel Good Inc. | Gorillaz
Hot in Herre | Nelly
Chop Suey! | System of a Down
Boulevard of Broken Dreams | Green Day
Single Ladies ~ Single Ladies (Put a Ring on It) | Beyoncé
One More Time | Daft Punk
SexyBack ~ Sexy Back | Justin Timberlake
Le vent nous portera | Noir Désir
Moi... Lolita ~ Moi Lolita | Alizée
Ces soirées-là | Yannick
Ma liberté de penser | Florent Pagny
Qui de nous deux | M ~ Matthieu Chedid ~ -M-
La Boulette | Diam's
Parce qu'on vient de loin | Corneille
Le chemin | Kyo
Le dîner | Bénabar
Femme Like U | K-Maro ~ K Maro
`,
  '2010': `
Rolling in the Deep | Adele
Get Lucky | Daft Punk ~ Pharrell Williams
Happy | Pharrell Williams
Uptown Funk | Mark Ronson ~ Bruno Mars
Shape of You | Ed Sheeran
Despacito | Luis Fonsi
Gangnam Style | PSY
Call Me Maybe | Carly Rae Jepsen
Somebody That I Used to Know | Gotye
Royals | Lorde
Shake It Off | Taylor Swift
Party Rock Anthem | LMFAO
Moves Like Jagger | Maroon 5
Titanium | David Guetta ~ Sia
Chandelier | Sia
Wake Me Up | Avicii
Lean On | Major Lazer ~ DJ Snake
Formidable | Stromae
Papaoutai | Stromae
Dernière danse | Indila
Je veux | Zaz
Bella | Gims ~ Maître Gims
Djadja | Aya Nakamura
Christine ~ Tilted | Christine and the Queens
Je vole | Louane
Bad Guy | Billie Eilish
Old Town Road | Lil Nas X
Thinking Out Loud | Ed Sheeran
Counting Stars | OneRepublic
Radioactive | Imagine Dragons
Shallow | Lady Gaga ~ Bradley Cooper
Andalouse | Kendji Girac
Tous les mêmes | Stromae
Sapés comme jamais | Gims ~ Maître Gims
`,
  '2020': `
Blinding Lights | The Weeknd ~ Weeknd
Levitating | Dua Lipa
Flowers | Miley Cyrus
As It Was | Harry Styles
Anti-Hero | Taylor Swift
Cruel Summer | Taylor Swift
Espresso | Sabrina Carpenter
Birds of a Feather | Billie Eilish
Die With a Smile | Lady Gaga ~ Bruno Mars
APT. ~ APT | ROSÉ ~ Rosé ~ Bruno Mars
Stay | The Kid LAROI ~ Kid Laroi ~ Justin Bieber
Peaches | Justin Bieber
Dance Monkey | Tones and I
Watermelon Sugar | Harry Styles
Unholy | Sam Smith ~ Kim Petras
Calm Down | Rema ~ Selena Gomez
vampire | Olivia Rodrigo
drivers license | Olivia Rodrigo
good 4 u | Olivia Rodrigo
Easy on Me | Adele
Bad Habits | Ed Sheeran
Heat Waves | Glass Animals
Houdini | Dua Lipa
Save Your Tears | The Weeknd ~ Weeknd
Montero (Call Me by Your Name) ~ Montero | Lil Nas X
Pookie | Aya Nakamura
Jolie nana | Aya Nakamura
Tout va bien | Orelsan
La kiffance | Naps
Ciel | Gims ~ Maître Gims
Mon amour | Slimane
Tattoo | Loreen
`,
  'variete': `
Les Champs-Élysées | Joe Dassin
L'été indien | Joe Dassin
Comme toi | Jean-Jacques Goldman
Quand la musique est bonne | Jean-Jacques Goldman
Mistral gagnant | Renaud
Alexandrie Alexandra | Claude François ~ Cloclo
Comme d'habitude | Claude François ~ Cloclo
La vie en rose | Édith Piaf
Non, je ne regrette rien | Édith Piaf
La bohème | Charles Aznavour
Emmenez-moi | Charles Aznavour
Je l'aime à mourir | Francis Cabrel
Désenchantée | Mylène Farmer
Pour que tu m'aimes encore | Céline Dion
Dernière danse | Indila
Je vole | Louane
Tombé sous le charme | Christophe Maé
Allumer le feu | Johnny Hallyday
Que je t'aime | Johnny Hallyday
Foule sentimentale | Alain Souchon
Ne me quitte pas | Jacques Brel
Les lacs du Connemara | Michel Sardou
Le Sud | Nino Ferrer
Je veux | Zaz
Balance ton quoi | Angèle
Ta reine | Angèle
Pas là | Vianney
Andalouse | Kendji Girac
Si seulement je pouvais lui manquer | Calogero
Coco Câline | Julien Doré
Place des grands hommes | Patrick Bruel
Le chanteur | Daniel Balavoine
La Javanaise | Serge Gainsbourg
Paroles, paroles | Dalida
Aline | Christophe
L'aventurier | Indochine
`,
  'rapfr': `
Basique | Orelsan
La terre est ronde | Orelsan
Caroline | MC Solaar
Bouge de là | MC Solaar
Dommage | Bigflo & Oli
Au DD | PNL
Ma Benz | Suprême NTM ~ NTM
Laisse pas traîner ton fils | Suprême NTM ~ NTM
Petit frère | IAM
Je danse le mia | IAM
Demain c'est loin | IAM
La Boulette | Diam's
DJ | Diam's
Sapés comme jamais | Gims ~ Maître Gims
DKR | Booba
Pitbull | Booba
Lettre à une femme | Ninho
On verra | Nekfeu
Yeux disent | Lomepal
Avant qu'elle parte | Sexion d'Assaut
Cosmo | Soprano
Désaccordé | Vald
Tchikita | Jul
Tonton du bled | 113
Chocolat | Lartiste
La kiffance | Naps
Réseaux | Niska
Zoo | Kaaris
Sur ma route | Black M
Meuda | Tiakola
Papaoutai | Stromae
`,
  'rapus': `
Lose Yourself | Eminem
The Real Slim Shady | Eminem
In da Club | 50 Cent
Gangsta's Paradise | Coolio
California Love | 2Pac ~ Tupac
Still D.R.E. ~ Still Dre | Dr. Dre ~ Dr Dre
Drop It Like It's Hot | Snoop Dogg
Juicy | The Notorious B.I.G. ~ Notorious BIG ~ Biggie
Hotline Bling | Drake
God's Plan | Drake
Sicko Mode | Travis Scott
HUMBLE. ~ Humble | Kendrick Lamar
Not Like Us | Kendrick Lamar
Stronger | Kanye West
Gold Digger | Kanye West
Empire State of Mind | Jay-Z ~ Alicia Keys
Rapper's Delight | The Sugarhill Gang ~ Sugarhill Gang
It Was a Good Day | Ice Cube
Ms. Jackson | Outkast
Lollipop | Lil Wayne
Super Bass | Nicki Minaj
rockstar ~ Rockstar | Post Malone
Thrift Shop | Macklemore & Ryan Lewis ~ Macklemore
Jump Around | House of Pain
Bodak Yellow | Cardi B
Fight the Power | Public Enemy
Walk This Way | Run-DMC ~ Run DMC ~ Aerosmith
Hot in Herre | Nelly
Old Town Road | Lil Nas X
`,
  'rock': `
Bohemian Rhapsody | Queen
We Will Rock You | Queen
Smells Like Teen Spirit | Nirvana
Back in Black | AC/DC
Highway to Hell | AC/DC
Thunderstruck | AC/DC
Sweet Child O' Mine | Guns N' Roses
Enter Sandman | Metallica
Nothing Else Matters | Metallica
Stairway to Heaven | Led Zeppelin
Hotel California | Eagles ~ The Eagles
Smoke on the Water | Deep Purple
Seven Nation Army | The White Stripes ~ White Stripes
Satisfaction ~ (I Can't Get No) Satisfaction | The Rolling Stones ~ Rolling Stones
Paint It Black ~ Paint It, Black | The Rolling Stones ~ Rolling Stones
Hey Jude | The Beatles ~ Beatles
Come Together | The Beatles ~ Beatles
It's My Life | Bon Jovi
Californication | Red Hot Chili Peppers ~ RHCP
Numb | Linkin Park
Du hast | Rammstein
The Final Countdown | Europe
Paranoid | Black Sabbath
Antisocial | Trust
Un autre monde | Téléphone
Uprising | Muse
Supermassive Black Hole | Muse
Do I Wanna Know? | Arctic Monkeys
Mr. Brightside | The Killers ~ Killers
Everlong | Foo Fighters
Basket Case | Green Day
Zombie | The Cranberries ~ Cranberries
Le vent nous portera | Noir Désir
`,
  'electro': `
One More Time | Daft Punk
Around the World | Daft Punk
Titanium | David Guetta ~ Sia
Levels | Avicii
Wake Me Up | Avicii
Animals | Martin Garrix
Lean On | Major Lazer ~ DJ Snake
Turn Down for What | DJ Snake ~ Lil Jon
Summer | Calvin Harris
We Found Love | Rihanna ~ Calvin Harris
Don't You Worry Child | Swedish House Mafia
Clarity | Zedd
Blue ~ Blue (Da Ba Dee) ~ Da Ba Dee | Eiffel 65
Rhythm Is a Dancer | Snap!
What Is Love | Haddaway
Sandstorm | Darude
Better Off Alone | Alice Deejay
Freed from Desire | Gala
Satisfaction | Benny Benassi
Lady ~ Lady (Hear Me Tonight) | Modjo
Music Sounds Better with You | Stardust
Alors on danse | Stromae
Call on Me | Eric Prydz
The Rhythm of the Night | Corona
Children | Robert Miles
Insomnia | Faithless
Kernkraft 400 | Zombie Nation
Hey Boy Hey Girl | The Chemical Brothers ~ Chemical Brothers
Praise You | Fatboy Slim
Cola | CamelPhat ~ Elderbrook
`,
  'kpop': `
Gangnam Style | PSY
Dynamite | BTS
Butter | BTS
Boy With Luv | BTS
DDU-DU DDU-DU ~ Ddu du ddu du | BLACKPINK
How You Like That | BLACKPINK
Kill This Love | BLACKPINK
Pink Venom | BLACKPINK
Fancy | TWICE
TT | TWICE
What is Love? | TWICE
God's Menu | Stray Kids
LOVE DIVE ~ Love Dive | IVE
Hype Boy | NewJeans
Super Shy | NewJeans
Next Level | aespa
Supernova | aespa
Psycho | Red Velvet
Love Scenario | iKON
Fantastic Baby | BIGBANG ~ Big Bang
Growl | EXO
Gee | Girls' Generation ~ SNSD
Sorry, Sorry ~ Sorry Sorry | Super Junior
ANTIFRAGILE ~ Antifragile | LE SSERAFIM ~ Le Sserafim
Seven | Jung Kook ~ Jungkook
APT. ~ APT | ROSÉ ~ Rosé
WANNABE ~ Wannabe | ITZY
Queencard | (G)I-DLE ~ i-dle ~ GIDLE ~ G Idle
Magnetic | ILLIT
`,
  'cine': `
My Heart Will Go On | Céline Dion
I Will Always Love You | Whitney Houston
Eye of the Tiger | Survivor
The Time of My Life ~ (I've Had) The Time of My Life | Bill Medley ~ Jennifer Warnes
Lose Yourself | Eminem
Stayin' Alive | Bee Gees
Let It Go | Idina Menzel
Libérée, délivrée | Anaïs Delva
Can You Feel the Love Tonight | Elton John
Danger Zone | Kenny Loggins
Ghostbusters | Ray Parker Jr. ~ Ray Parker Jr
Skyfall | Adele
Shallow | Lady Gaga ~ Bradley Cooper
What a Feeling ~ Flashdance... What a Feeling | Irene Cara
Men in Black | Will Smith
Oh, Pretty Woman | Roy Orbison
Unchained Melody | The Righteous Brothers ~ Righteous Brothers
Stand by Me | Ben E. King
Mrs. Robinson | Simon & Garfunkel
Kiss from a Rose | Seal
Born to Be Wild | Steppenwolf
Misirlou | Dick Dale
You Never Can Tell | Chuck Berry
I'll Be There for You | The Rembrandts ~ Rembrandts
(Everything I Do) I Do It for You | Bryan Adams
See You Again | Wiz Khalifa ~ Charlie Puth
Take My Breath Away | Berlin
Mamma Mia | ABBA
All Star | Smash Mouth
City of Stars | Ryan Gosling ~ Emma Stone
`,
};

export const CATS = [
  { id: 'mix', name: 'Mix', sub: 'Tous styles' },
  { id: '80', name: 'Années 80', sub: 'Pop • FR • Rock' },
  { id: '90', name: 'Années 90', sub: 'Pop • Rock' },
  { id: '2000', name: 'Années 2000', sub: 'Pop • Rap • Rock' },
  { id: '2010', name: 'Années 2010', sub: 'Pop • Rap' },
  { id: '2020', name: 'Années 2020', sub: 'Hits récents' },
  { id: 'variete', name: 'Variété FR', sub: 'Chanson FR' },
  { id: 'rapfr', name: 'Rap FR', sub: '100% Rap FR' },
  { id: 'rapus', name: 'Rap US', sub: '100% Rap US' },
  { id: 'rock', name: 'Rock', sub: 'Rock • Métal' },
  { id: 'electro', name: 'Électro', sub: 'Dance • EDM' },
  { id: 'kpop', name: 'K-Pop', sub: 'K-Pop • Asie' },
  { id: 'cine', name: 'Ciné & séries', sub: 'B.O. cultes' },
];

export const CAT_IDS = new Set(CATS.map(c => c.id));

// mode Classé : 4 catégories tirées au sort pour chaque saison (mois), les mêmes pour tout le monde pendant la saison.
// override (variable RANKED_CATS, pour les tests en local) : liste fixe « rapfr,rock,… »
const RANKED_POOL = ['80', '90', '2000', '2010', '2020', 'variete', 'rapfr', 'rapus', 'rock', 'electro', 'kpop', 'cine'];
export function rankedCats(sc, override) {
  if (override) {
    const list = String(override).split(',').map(c => c.trim()).filter(c => CAT_IDS.has(c));
    if (list.length) return list;
  }
  let h = 2166136261;
  for (const c of 'hitroom:' + sc) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const pool = RANKED_POOL.slice(), out = [];
  while (out.length < 4) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    out.push(pool.splice((h >>> 8) % pool.length, 1)[0]);
  }
  return out;
}

function parse(block) {
  return block.trim().split('\n').map(line => {
    const [tt, aa] = line.split(' | ');
    const t = tt.split(' ~ ').map(s => s.trim());
    const a = aa.split(' ~ ').map(s => s.trim());
    return { k: (a[0] + '|' + t[0]).toLowerCase(), t, a };
  });
}

const BY_CAT = {};
const ALL = new Map();
for (const [id, block] of Object.entries(RAW)) {
  const seen = new Set();
  BY_CAT[id] = parse(block).filter(s => !seen.has(s.k) && seen.add(s.k));
  for (const s of BY_CAT[id]) if (!ALL.has(s.k)) ALL.set(s.k, s);
}
BY_CAT.mix = [...ALL.values()];

// cat : une catégorie, ou jusqu'à 3 mélangées (« rock+80+90 », salons privés Premium)
export function songsOf(cat) {
  if (cat && cat.includes('+')) {
    const seen = new Set();
    const list = cat.split('+').flatMap(c => BY_CAT[c] || []).filter(s => !seen.has(s.k) && seen.add(s.k));
    if (list.length) return list;
  }
  return BY_CAT[cat] || BY_CAT.mix;
}

export function songByKey(k) {
  return ALL.get(k);
}
