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
Vacances j'oublie tout | Elegance
Les démons de minuit | Images
Voyage, voyage | Desireless
Joe le taxi | Vanessa Paradis
Toute première fois | Jeanne Mas
Tous les cris les S.O.S. | Daniel Balavoine
Partenaire particulier | Partenaire Particulier
Nuit de folie | Début de Soirée
Cendrillon | Téléphone
Sweet Child O' Mine | Guns N' Roses
Thriller | Michael Jackson
Beat It | Michael Jackson
Bad | Michael Jackson
Smooth Criminal | Michael Jackson
Material Girl | Madonna
La Isla Bonita | Madonna
Like a Prayer | Madonna
Papa Don't Preach | Madonna
Into the Groove | Madonna
Holiday | Madonna
Last Christmas | Wham!
Faith | George Michael
Under Pressure | Queen ~ David Bowie
Radio Ga Ga | Queen
I Want to Break Free | Queen
Let's Dance | David Bowie
Karma Chameleon | Culture Club
Do You Really Want to Hurt Me | Culture Club
Relax | Frankie Goes to Hollywood
Don't You Want Me | The Human League ~ Human League
Enola Gay | Orchestral Manoeuvres in the Dark ~ OMD
Just Can't Get Enough | Depeche Mode
Personal Jesus | Depeche Mode
Time After Time | Cyndi Lauper
True Colors | Cyndi Lauper
Walk Like an Egyptian | The Bangles ~ Bangles
Eternal Flame | The Bangles ~ Bangles
Heaven Is a Place on Earth | Belinda Carlisle
Holding Out for a Hero | Bonnie Tyler
It's a Sin | Pet Shop Boys
West End Girls | Pet Shop Boys
Don't Worry, Be Happy ~ Don't Worry Be Happy | Bobby McFerrin
Celebration | Kool & the Gang
Upside Down | Diana Ross
Pump Up the Jam | Technotronic
Ride on Time | Black Box
Lambada | Kaoma
Running Up That Hill | Kate Bush
Dancing in the Dark | Bruce Springsteen
Born in the U.S.A. ~ Born in the USA | Bruce Springsteen
Summer of '69 ~ Summer of 69 | Bryan Adams
Here I Go Again | Whitesnake
The Final Countdown | Europe
Pour Some Sugar on Me | Def Leppard
Hungry Like the Wolf | Duran Duran
Rio | Duran Duran
Gold | Spandau Ballet
True | Spandau Ballet
Uptown Girl | Billy Joel
I Just Called to Say I Love You | Stevie Wonder
Hello | Lionel Richie
All Night Long | Lionel Richie
We Are the World | USA for Africa
Kiss | Prince
When Doves Cry | Prince
I'm So Excited | The Pointer Sisters ~ Pointer Sisters
Physical | Olivia Newton-John
Fame | Irene Cara
Maniac | Michael Sembello
The Power of Love | Huey Lewis and the News ~ Huey Lewis
Rock Me Amadeus | Falco
Self Control | Laura Branigan
Gloria | Laura Branigan
You Spin Me Round ~ You Spin Me Round (Like a Record) | Dead or Alive
Tarzan Boy | Baltimora
Cheri Cheri Lady | Modern Talking
You're My Heart, You're My Soul ~ You're My Heart You're My Soul | Modern Talking
Bamboléo | Gipsy Kings
Marcia Baïla | Les Rita Mitsouko ~ Rita Mitsouko
C'est comme ça | Les Rita Mitsouko ~ Rita Mitsouko
L'aventurier | Indochine
3e sexe ~ 3ème sexe ~ Troisième sexe | Indochine
Week-end à Rome | Étienne Daho
Ouragan | Stéphanie ~ Stéphanie de Monaco
Résiste | France Gall
Babacar | France Gall
Évidemment | France Gall
Il jouait du piano debout | France Gall
Mon mec à moi | Patricia Kaas
Mademoiselle chante le blues | Patricia Kaas
Libertine | Mylène Farmer
Pourvu qu'elles soient douces | Mylène Farmer
Sans contrefaçon | Mylène Farmer
Ça (c'est vraiment toi) ~ C'est vraiment toi | Téléphone
New York avec toi | Téléphone
L'Aziza | Daniel Balavoine
Sauver l'amour | Daniel Balavoine
Mon fils ma bataille | Daniel Balavoine
Encore un matin | Jean-Jacques Goldman
Envole-moi | Jean-Jacques Goldman
Je te donne | Jean-Jacques Goldman ~ Michael Jones
Là-bas | Jean-Jacques Goldman ~ Sirima
Je marche seul | Jean-Jacques Goldman
Elle a fait un bébé toute seule | Jean-Jacques Goldman
Ville de lumière | Gold
Viens boire un p'tit coup à la maison | Licence IV
La danse des canards | J.J. Lionel ~ JJ Lionel
Chacun fait (c'qui lui plaît) ~ Chacun fait c'qui lui plaît | Chagrin d'amour
Musulmanes | Michel Sardou
Être une femme | Michel Sardou
Quelque chose de Tennessee | Johnny Hallyday
Les bêtises | Sabine Paturel
Les sunlights des tropiques | Gilbert Montagné
On va s'aimer | Gilbert Montagné
Désir désir | Laurent Voulzy ~ Véronique Jannot
Belle-Île-en-Mer, Marie-Galante ~ Belle-Île-en-Mer | Laurent Voulzy
Cœur de loup | Philippe Lafontaine
Elle a les yeux revolver | Marc Lavoine
Hélène | Roch Voisine
T'en va pas | Elsa ~ Elsa Lunghini
Boule de flipper | Corynne Charby
Vertige de l'amour | Alain Bashung
Mélissa | Julien Clerc
Né quelque part | Maxime Le Forestier
C'est la ouate | Caroline Loeb
Le bal masqué | La Compagnie Créole
Ça fait rire les oiseaux | La Compagnie Créole
L'amour à la plage | Niagara
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
Everybody ~ Everybody (Backstreet's Back) | Backstreet Boys
Genie in a Bottle | Christina Aguilera
My Heart Will Go On | Céline Dion
I Will Always Love You | Whitney Houston
Frozen | Madonna
Smooth | Santana ~ Rob Thomas
Livin' la Vida Loca | Ricky Martin
Coco Jamboo | Mr. President
Be My Lover | La Bouche
Mr. Vain | Culture Beat
No Limit | 2 Unlimited
Get Ready for This | 2 Unlimited
Saturday Night | Whigfield
Cotton Eye Joe | Rednex
Boom, Boom, Boom, Boom!! ~ Boom Boom Boom Boom | Vengaboys
We Like to Party! ~ We Like to Party | Vengaboys
All That She Wants | Ace of Base
The Sign | Ace of Base
What's Up? ~ What's Up | 4 Non Blondes
Creep | Radiohead
Song 2 | Blur
Don't Look Back in Anger | Oasis
Common People | Pulp
Under the Bridge | Red Hot Chili Peppers ~ RHCP
Black Hole Sun | Soundgarden
Come as You Are | Nirvana
November Rain | Guns N' Roses
Don't Speak | No Doubt
Ironic | Alanis Morissette
Kiss Me | Sixpence None the Richer
Truly Madly Deeply | Savage Garden
I Don't Want to Miss a Thing | Aerosmith
Everybody Hurts | R.E.M. ~ REM
Wind of Change | Scorpions
Killing Me Softly ~ Killing Me Softly with His Song | Fugees ~ The Fugees ~ Lauryn Hill
Waterfalls | TLC
Un-Break My Heart ~ Unbreak My Heart | Toni Braxton
End of the Road | Boyz II Men
All I Want for Christmas Is You | Mariah Carey
Hero | Mariah Carey
Back for Good | Take That
Angels | Robbie Williams
Bailando | Paradisio
Ecuador | Sash!
Gonna Make You Sweat ~ Gonna Make You Sweat (Everybody Dance Now) ~ Everybody Dance Now | C+C Music Factory
Show Me Love | Robin S
Finally | CeCe Peniston
9 PM (Till I Come) ~ 9 PM ~ Till I Come | ATB
Say My Name | Destiny's Child
Firestarter | The Prodigy ~ Prodigy
Breathe | The Prodigy ~ Prodigy
Jump | Kris Kross
Samba de Janeiro | Bellini
S'il suffisait d'aimer | Céline Dion
Je sais pas | Céline Dion
On ne change pas | Céline Dion
Tandem | Vanessa Paradis
Be My Baby | Vanessa Paradis
La corrida | Francis Cabrel
Belle | Garou ~ Daniel Lavoie ~ Patrick Fiori
Le temps des cathédrales | Bruno Pelletier
Qui a le droit | Patrick Bruel
Alors regarde | Patrick Bruel
Sensualité | Axelle Red
XXL | Mylène Farmer
Allumer le feu | Johnny Hallyday
Vivre pour le meilleur | Johnny Hallyday
Dieu m'a donné la foi | Ophélie Winter
Né en 17 à Leidenstadt | Fredericks Goldman Jones ~ Jean-Jacques Goldman ~ Carole Fredericks
Dur dur d'être bébé ! ~ Dur dur d'être bébé | Jordy
J't'emmène au vent | Louise Attaque
L'hymne de nos campagnes | Tryo
Lambé an dro | Matmatah
Tu m'oublieras | Larusso
Partir un jour | 2Be3
Chanter pour ceux qui sont loin de chez eux | Lââm
Il y a trop de gens qui t'aiment | Hélène Ségara
Savoir aimer | Florent Pagny
Didi | Khaled
Ma petite entreprise | Alain Bashung
Saga Africa | Yannick Noah
Je t'aime | Lara Fabian
Un jour en France | Noir Désir
Je danse le mia | IAM
Caroline | MC Solaar
Ma Benz | Suprême NTM ~ NTM
Nirvana | Doc Gynéco
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
Ma philosophie | Amel Bent
Ma liberté de penser | Florent Pagny
Qui de nous deux | M ~ Matthieu Chedid ~ -M-
La Boulette | Diam's
Parce qu'on vient de loin | Corneille
Le chemin | Kyo
Le dîner | Bénabar
Femme Like U | K-Maro ~ K Maro
Oops!... I Did It Again ~ Oops I Did It Again | Britney Spears
Womanizer | Britney Spears
Bye Bye Bye | *NSYNC ~ NSYNC
It Wasn't Me | Shaggy
Angel | Shaggy
Lady Marmalade | Christina Aguilera ~ Lil' Kim ~ Mya ~ Pink
Beautiful | Christina Aguilera
Can't Get You Out of My Head | Kylie Minogue
Beautiful Day | U2
Yellow | Coldplay
Viva la Vida | Coldplay
Fix You | Coldplay
Bring Me to Life | Evanescence
How You Remind Me | Nickelback
American Idiot | Green Day
Sk8er Boi ~ Skater Boy | Avril Lavigne
Girlfriend | Avril Lavigne
Hollaback Girl | Gwen Stefani
Bleeding Love | Leona Lewis
Halo | Beyoncé
Irreplaceable | Beyoncé
Survivor | Destiny's Child
Promiscuous | Nelly Furtado
Maneater | Nelly Furtado
Don't Cha | The Pussycat Dolls ~ Pussycat Dolls
Just Dance | Lady Gaga
Bad Romance | Lady Gaga
Hot n Cold | Katy Perry
I Kissed a Girl | Katy Perry
Disturbia | Rihanna
Don't Stop the Music | Rihanna
SOS | Rihanna
Low | Flo Rida
Apologize | Timbaland ~ OneRepublic
The Way I Are | Timbaland
Cry Me a River | Justin Timberlake
Mercy | Duffy
Valerie | Amy Winehouse ~ Mark Ronson
Back to Black | Amy Winehouse
Chasing Cars | Snow Patrol
Somewhere Only We Know | Keane
Use Somebody | Kings of Leon
Sex on Fire | Kings of Leon
Hey There Delilah | Plain White T's
Bad Day | Daniel Powter
You're Beautiful | James Blunt
Dragostea din tei | O-Zone
Whenever, Wherever ~ Whenever Wherever | Shakira
La Tortura | Shakira
Daddy DJ | Daddy DJ
Hung Up | Madonna
4 Minutes | Madonna ~ Justin Timberlake
Feel | Robbie Williams
Rock DJ | Robbie Williams
Where Is the Love? ~ Where Is the Love | The Black Eyed Peas ~ Black Eyed Peas
Aserejé ~ The Ketchup Song | Las Ketchup
Who Let the Dogs Out | Baha Men
Murder on the Dancefloor | Sophie Ellis-Bextor
Unwritten | Natasha Bedingfield
Love Story | Taylor Swift
You Belong with Me | Taylor Swift
Party in the U.S.A. ~ Party in the USA | Miley Cyrus
TiK ToK ~ Tik Tok | Kesha ~ Ke$ha
Fireflies | Owl City
Grace Kelly | Mika
Love Generation | Bob Sinclar
When Love Takes Over | David Guetta ~ Kelly Rowland
Seul | Garou
Sous le vent | Garou ~ Céline Dion
Les rois du monde | Roméo et Juliette ~ Damien Sargue ~ Grégori Baquet ~ Philippe d'Avilla
L'envie d'aimer | Les Dix Commandements ~ Daniel Lévi
J'ai demandé à la lune | Indochine
Tout le bonheur du monde | Sinsemilia
Hey Oh | Tragédie
Tu trouveras | Natasha St-Pier ~ Pascal Obispo
1er gaou ~ Premier gaou | Magic System
Bouger bouger | Magic System
J'en ai marre ! ~ J'en ai marre | Alizée
J'ai pas vingt ans | Alizée
On s'attache | Christophe Maé
Mon paradis | Christophe Maé
Face à la mer | Calogero ~ Passi
En apesanteur | Calogero
Caravane | Raphaël
Elle me contrôle | M. Pokora ~ Matt Pokora ~ Pokora
J'attends l'amour | Jenifer
Au soleil | Jenifer
Près de moi | Lorie
Dernière danse | Kyo
Butterfly | Superbus
Dis-moi | BB Brunes
J'traîne des pieds | Olivia Ruiz
Marly-Gomont | Kamini
Ça m'énerve | Helmut Fritz
Comme des enfants | Cœur de pirate
J'aime plus Paris | Thomas Dutronc
Jeune demoiselle | Diam's
Gravé dans la roche | Sniper
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
Waka Waka ~ Waka Waka (This Time for Africa) | Shakira
Love the Way You Lie | Eminem ~ Rihanna
Someone Like You | Adele
Hello | Adele
Set Fire to the Rain | Adele
Firework | Katy Perry
Roar | Katy Perry
Dark Horse | Katy Perry
Grenade | Bruno Mars
Just the Way You Are | Bruno Mars
Locked Out of Heaven | Bruno Mars
24K Magic | Bruno Mars
Rather Be | Clean Bandit ~ Jess Glynne
Rockabye | Clean Bandit
Hey Brother | Avicii
The Nights | Avicii
Stay with Me | Sam Smith
Let Her Go | Passenger
Riptide | Vance Joy
Pompeii | Bastille
Demons | Imagine Dragons
Believer | Imagine Dragons
Thunder | Imagine Dragons
Stressed Out | Twenty One Pilots
Sorry | Justin Bieber
Love Yourself | Justin Bieber
Baby | Justin Bieber
What Do You Mean? ~ What Do You Mean | Justin Bieber
Cheap Thrills | Sia
Diamonds | Rihanna
Only Girl ~ Only Girl (In the World) | Rihanna
Work | Rihanna ~ Drake
Blank Space | Taylor Swift
Look What You Made Me Do | Taylor Swift
Perfect | Ed Sheeran
Havana | Camila Cabello
Señorita | Shawn Mendes ~ Camila Cabello
Stitches | Shawn Mendes
Closer | The Chainsmokers ~ Chainsmokers ~ Halsey
Faded | Alan Walker
This Is What You Came For | Calvin Harris ~ Rihanna
Wrecking Ball | Miley Cyrus
Born This Way | Lady Gaga
Blurred Lines | Robin Thicke
Timber | Pitbull ~ Kesha
Give Me Everything | Pitbull
On the Floor | Jennifer Lopez
Danza Kuduro | Don Omar
Mi Gente | J Balvin
Taki Taki | DJ Snake
Bailando | Enrique Iglesias
Pumped Up Kicks | Foster the People
Can't Stop the Feeling! ~ Can't Stop the Feeling | Justin Timberlake
Shut Up and Dance | Walk the Moon
One Kiss | Calvin Harris ~ Dua Lipa
New Rules | Dua Lipa
Sunflower | Post Malone ~ Swae Lee
Circles | Post Malone
Someone You Loved | Lewis Capaldi
Memories | Maroon 5
Girls Like You | Maroon 5
Sugar | Maroon 5
Payphone | Maroon 5
Prayer in C | Lilly Wood and the Prick ~ Robin Schulz
Waves | Mr Probz
Lush Life | Zara Larsson
All of Me | John Legend
7 rings | Ariana Grande
thank u, next ~ Thank U Next | Ariana Grande
Alors on danse | Stromae
Tourner dans le vide | Indila
On ira | Zaz
J'me tire | Gims ~ Maître Gims
Est-ce que tu m'aimes ? ~ Est-ce que tu m'aimes | Gims ~ Maître Gims
La même | Gims ~ Maître Gims ~ Vianney
Copines | Aya Nakamura
Avenir | Louane
Color Gitano | Kendji Girac
Les yeux de la mama | Kendji Girac
Je m'en vais | Vianney
Il est où le bonheur | Christophe Maé
Elle me dit | Mika
Tout oublier | Angèle ~ Roméo Elvis
Désolé | Sexion d'Assaut
J'ai cherché | Amir
Ça va ça vient | Vitaa ~ Slimane
Bim bam toi | Carla
Reine | Dadju
Paris-Seychelles | Julien Doré
La grenade | Clara Luciani
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
Shivers | Ed Sheeran
Kiss Me More | Doja Cat ~ SZA
Say So | Doja Cat
Paint the Town Red | Doja Cat
Kill Bill | SZA
Rain on Me | Lady Gaga ~ Ariana Grande
positions ~ Positions | Ariana Grande
Don't Start Now | Dua Lipa
Dance the Night | Dua Lipa
Cold Heart ~ Cold Heart (PNAU Remix) | Elton John ~ Dua Lipa
Mood | 24kGoldn ~ Iann Dior
Savage Love | Jawsh 685 ~ Jason Derulo
Leave the Door Open | Silk Sonic ~ Bruno Mars ~ Anderson .Paak
Golden Hour | JVKE
Lose Control | Teddy Swims
Beautiful Things | Benson Boone
A Bar Song ~ A Bar Song (Tipsy) | Shaboozey
Too Sweet | Hozier
Lovin On Me | Jack Harlow
Greedy | Tate McRae
Water | Tyla
Ella Baila Sola | Eslabon Armado ~ Peso Pluma
TQG | Karol G ~ Shakira
Tití Me Preguntó | Bad Bunny
abcdefu | GAYLE
Industry Baby | Lil Nas X ~ Jack Harlow
Ghost | Justin Bieber
Pink Pony Club | Chappell Roan
Good Luck, Babe! ~ Good Luck Babe | Chappell Roan
Please Please Please | Sabrina Carpenter
Messy | Lola Young
Abracadabra | Lady Gaga
Ordinary | Alex Warren
Si No Estás | Iñigo Quintero
Padam Padam | Kylie Minogue
Miracle | Calvin Harris ~ Ellie Goulding
I'm Good ~ I'm Good (Blue) | David Guetta ~ Bebe Rexha
Baby Don't Hurt Me | David Guetta ~ Anne-Marie ~ Coi Leray
Where Are You Now | Lost Frequencies ~ Calum Scott
Running Up That Hill | Kate Bush
Bande organisée | 13 Organisé ~ Jul ~ SCH ~ Naps
Petit génie | Jungeli ~ Imen Es ~ Alonzo
Ma meilleure ennemie | Stromae ~ Pomme
L'enfer | Stromae
Santé | Stromae
Saiyan | Heuss l'Enfoiré ~ Gazo
Die | Gazo
Évidemment | La Zarra
Voilà | Barbara Pravi
Bolide allemand | SDM
Ceux qu'on était | Pierre Garnier
N'y pense plus | Tayc
Le dernier jour du disco | Juliette Armanet
Le reste | Clara Luciani
Triple V | Werenoi ~ Damso ~ Ninho
Dégaine | Aya Nakamura ~ Damso
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
La mer | Charles Trenet
Douce France | Charles Trenet
Y'a d'la joie | Charles Trenet
Les feuilles mortes | Yves Montand
À bicyclette | Yves Montand
Milord | Édith Piaf
L'hymne à l'amour | Édith Piaf
Padam, padam ~ Padam padam | Édith Piaf
La foule | Édith Piaf
Hier encore | Charles Aznavour
For me formidable | Charles Aznavour
Amsterdam | Jacques Brel
La valse à mille temps | Jacques Brel
Le plat pays | Jacques Brel
Les copains d'abord | Georges Brassens
La mauvaise réputation | Georges Brassens
Je t'aime... moi non plus ~ Je t'aime moi non plus | Serge Gainsbourg ~ Jane Birkin
Le poinçonneur des Lilas | Serge Gainsbourg
Je suis venu te dire que je m'en vais | Serge Gainsbourg
Couleur café | Serge Gainsbourg
Laisse tomber les filles | France Gall
Poupée de cire, poupée de son ~ Poupée de cire poupée de son | France Gall
Tous les garçons et les filles | Françoise Hardy
Comment te dire adieu | Françoise Hardy
Le temps de l'amour | Françoise Hardy
La Maritza | Sylvie Vartan
Salut les amoureux | Joe Dassin
Et si tu n'existais pas | Joe Dassin
À toi | Joe Dassin
Siffler sur la colline | Joe Dassin
Belles ! Belles ! Belles ! ~ Belles belles belles | Claude François ~ Cloclo
Magnolias for Ever | Claude François ~ Cloclo
Le téléphone pleure | Claude François ~ Cloclo
Le lundi au soleil | Claude François ~ Cloclo
Bambino | Dalida
Gigi l'amoroso | Dalida
Il venait d'avoir 18 ans | Dalida
Laissez-moi danser ~ Laissez-moi danser (Monday, Tuesday) | Dalida
Mourir sur scène | Dalida
Salma ya salama | Dalida
Les mots bleus | Christophe
Retiens la nuit | Johnny Hallyday
Gabrielle | Johnny Hallyday
L'envie | Johnny Hallyday
Noir c'est noir | Johnny Hallyday
Je te promets | Johnny Hallyday
Le pénitencier | Johnny Hallyday
La maladie d'amour | Michel Sardou
En chantant | Michel Sardou
Les cornichons | Nino Ferrer
Mirza | Nino Ferrer
Il est cinq heures, Paris s'éveille ~ Il est cinq heures Paris s'éveille | Jacques Dutronc
Et moi, et moi, et moi ~ Et moi et moi et moi | Jacques Dutronc
J'aime les filles | Jacques Dutronc
Petite Marie | Francis Cabrel
L'encre de tes yeux | Francis Cabrel
Laisse béton | Renaud
Dès que le vent soufflera | Renaud
Morgane de toi | Renaud
La groupie du pianiste | Michel Berger
Le paradis blanc | Michel Berger
Et maintenant | Gilbert Bécaud
Nathalie | Gilbert Bécaud
L'important c'est la rose | Gilbert Bécaud
Mon vieux | Daniel Guichard
Je suis malade | Serge Lama
SOS d'un terrien en détresse | Daniel Balavoine
La chanson des Restos | Les Enfoirés
Fais-moi une place | Julien Clerc
Ma préférence | Julien Clerc
Femmes... je vous aime ~ Femmes je vous aime | Julien Clerc
Sous le ciel de Paris | Édith Piaf
Un homme heureux | William Sheller
Lettre à France | Michel Polnareff
On ira tous au paradis | Michel Polnareff
Love Me, Please Love Me ~ Love Me Please Love Me | Michel Polnareff
Vous les femmes ~ Vous les femmes (Pobre diablo) | Julio Iglesias
Prendre un enfant | Yves Duteil
Santiano | Hugues Aufray
Jardin d'hiver | Henri Salvador
Laisse-moi t'aimer | Mike Brant
Qui saura | Mike Brant
L'école est finie | Sheila
Spacer | Sheila
Où sont les femmes ? ~ Où sont les femmes | Patrick Juvet
La ballade des gens heureux | Gérard Lenorman
Ça plane pour moi | Plastic Bertrand
Allô maman bobo | Alain Souchon
J'ai dix ans | Alain Souchon
Rockollection | Laurent Voulzy
Amoureuse | Véronique Sanson
San Francisco | Maxime Le Forestier
La montagne | Jean Ferrat
Toulouse | Claude Nougaro
L'aigle noir | Barbara
Une belle histoire | Michel Fugain
Capri c'est fini | Hervé Vilard
Tombe la neige | Adamo ~ Salvatore Adamo
Casser la voix | Patrick Bruel
Envole-moi | Jean-Jacques Goldman
Résiste | France Gall
Mon mec à moi | Patricia Kaas
Hélène | Roch Voisine
Il y a trop de gens qui t'aiment | Hélène Ségara
Seul | Garou
Face à la mer | Calogero ~ Passi
Il est où le bonheur | Christophe Maé
Je m'en vais | Vianney
On ira | Zaz
Paris-Seychelles | Julien Doré
La grenade | Clara Luciani
Le dernier jour du disco | Juliette Armanet
J'ai cherché | Amir
Voilà | Barbara Pravi
Mon amour | Slimane
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
La vie qu'on mène | Ninho
On verra | Nekfeu
Yeux disent | Lomepal
Avant qu'elle parte | Sexion d'Assaut
Cosmo | Soprano
Journal perso II ~ Journal perso 2 | Vald
Tchikita | Jul
Tonton du bled | 113
Chocolat | Lartiste
La kiffance | Naps
Réseaux | Niska
Zoo | Kaaris
Sur ma route | Black M
Meuda | Tiakola
Papaoutai | Stromae
Jefe | Ninho
Maman ne le sait pas | Ninho ~ Niska
Macarena | Damso
Feu de bois | Damso
On m'appelle l'ovni | Jul
Bande organisée | 13 Organisé ~ Jul ~ SCH ~ Naps
Deux frères | PNL
Le monde ou rien | PNL
Naha | PNL
Égérie | Nekfeu
San | Orelsan
Défaite de famille | Orelsan
Tout va bien | Orelsan
Validée | Booba
Tchoin | Kaaris
Medellín ~ Medellin | Niska
En feu | Soprano
Clown | Soprano
Désolé | Sexion d'Assaut
Ma direction | Sexion d'Assaut
Plus tard | Bigflo & Oli
Trop beau | Lomepal
Eurotrap | Vald
Mafiosa | Lartiste
Qui est l'exemple ? ~ Qui est l'exemple | Rohff
Gravé dans la roche | Sniper
Jeune demoiselle | Diam's
Ma France à moi | Diam's
L'école du micro d'argent | IAM
Seine-Saint-Denis Style | Suprême NTM ~ NTM
Nouveau western | MC Solaar
Victime de la mode | MC Solaar
Angela | Saïan Supa Crew
Nirvana | Doc Gynéco
RR 9.1 | Koba LaD
Moulaga | Heuss l'Enfoiré ~ Jul
Dalida | Soolking
Suavemente | Soolking
Die | Gazo
Saiyan | Heuss l'Enfoiré ~ Gazo
Triple V | Werenoi ~ Damso ~ Ninho
Bolide allemand | SDM
Marly-Gomont | Kamini
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
My Name Is | Eminem
Stan | Eminem ~ Dido
Without Me | Eminem
Mockingbird | Eminem
Rap God | Eminem
'Till I Collapse ~ Till I Collapse | Eminem
Love the Way You Lie | Eminem ~ Rihanna
Candy Shop | 50 Cent
Changes | 2Pac ~ Tupac
Dear Mama | 2Pac ~ Tupac
Hypnotize | The Notorious B.I.G. ~ Notorious BIG ~ Biggie
Big Poppa | The Notorious B.I.G. ~ Notorious BIG ~ Biggie
The Next Episode | Dr. Dre ~ Dr Dre ~ Snoop Dogg
Forgot About Dre | Dr. Dre ~ Dr Dre ~ Eminem
Gin and Juice | Snoop Dogg
Young, Wild & Free ~ Young Wild and Free | Snoop Dogg ~ Wiz Khalifa ~ Bruno Mars
Regulate | Warren G ~ Nate Dogg
No Diggity | Blackstreet
C.R.E.A.M. ~ CREAM | Wu-Tang Clan
Party Up ~ Party Up (Up in Here) | DMX
Get Ur Freak On | Missy Elliott
Work It | Missy Elliott
Dilemma | Nelly ~ Kelly Rowland
A Milli | Lil Wayne
Crank That ~ Crank That (Soulja Boy) | Soulja Boy ~ Soulja Boy Tell'em
Heartless | Kanye West
Power | Kanye West
Flashing Lights | Kanye West
99 Problems | Jay-Z
Hard Knock Life ~ Hard Knock Life (Ghetto Anthem) | Jay-Z
One Dance | Drake
In My Feelings | Drake
Started from the Bottom | Drake
goosebumps ~ Goosebumps | Travis Scott
Alright | Kendrick Lamar
Swimming Pools ~ Swimming Pools (Drank) | Kendrick Lamar
DNA. ~ DNA | Kendrick Lamar
Anaconda | Nicki Minaj
Starships | Nicki Minaj
Congratulations | Post Malone
Can't Hold Us | Macklemore & Ryan Lewis ~ Macklemore
I Like It | Cardi B ~ Bad Bunny ~ J Balvin
WAP | Cardi B ~ Megan Thee Stallion
Mask Off | Future
Bad and Boujee | Migos
XO Tour Llif3 ~ XO Tour Life | Lil Uzi Vert
Lucid Dreams | Juice WRLD
SAD! ~ Sad | XXXTENTACION
Gucci Gang | Lil Pump
Mo Bamba | Sheck Wes
The Box | Roddy Ricch
Black Beatles | Rae Sremmurd
Low | Flo Rida
Right Round | Flo Rida
Black and Yellow | Wiz Khalifa
Ice Ice Baby | Vanilla Ice
U Can't Touch This | MC Hammer
Jump | Kris Kross
Hip Hop Hooray | Naughty by Nature
Insane in the Brain | Cypress Hill
Gettin' Jiggy wit It | Will Smith
Push It | Salt-N-Pepa
The Message | Grandmaster Flash and the Furious Five ~ Grandmaster Flash
Hey Ya! | Outkast
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
Don't Stop Me Now | Queen
Somebody to Love | Queen
Under Pressure | Queen ~ David Bowie
Another One Bites the Dust | Queen
You Shook Me All Night Long | AC/DC
T.N.T. ~ TNT | AC/DC
Welcome to the Jungle | Guns N' Roses
Knockin' on Heaven's Door | Guns N' Roses
Paradise City | Guns N' Roses
November Rain | Guns N' Roses
Master of Puppets | Metallica
Whole Lotta Love | Led Zeppelin
Immigrant Song | Led Zeppelin
Sympathy for the Devil | The Rolling Stones ~ Rolling Stones
Start Me Up | The Rolling Stones ~ Rolling Stones
Angie | The Rolling Stones ~ Rolling Stones
Let It Be | The Beatles ~ Beatles
Yesterday | The Beatles ~ Beatles
Help! ~ Help | The Beatles ~ Beatles
Twist and Shout | The Beatles ~ Beatles
Here Comes the Sun | The Beatles ~ Beatles
Livin' on a Prayer | Bon Jovi
You Give Love a Bad Name | Bon Jovi
Scar Tissue | Red Hot Chili Peppers ~ RHCP
Can't Stop | Red Hot Chili Peppers ~ RHCP
Under the Bridge | Red Hot Chili Peppers ~ RHCP
In the End | Linkin Park
What I've Done | Linkin Park
Sonne | Rammstein
Iron Man | Black Sabbath
Born to Run | Bruce Springsteen
Light My Fire | The Doors ~ Doors
Riders on the Storm | The Doors ~ Doors
Purple Haze | The Jimi Hendrix Experience ~ Jimi Hendrix
Hey Joe | The Jimi Hendrix Experience ~ Jimi Hendrix
Wish You Were Here | Pink Floyd
Another Brick in the Wall | Pink Floyd
Comfortably Numb | Pink Floyd
Baba O'Riley | The Who ~ Who
My Generation | The Who ~ Who
Born to Be Wild | Steppenwolf
Free Bird | Lynyrd Skynyrd
Sweet Home Alabama | Lynyrd Skynyrd
Dream On | Aerosmith
I Don't Want to Miss a Thing | Aerosmith
Rock and Roll All Nite | Kiss
I Was Made for Lovin' You | Kiss
Jump | Van Halen
Creep | Radiohead
Song 2 | Blur
Wonderwall | Oasis
Don't Look Back in Anger | Oasis
Come as You Are | Nirvana
Black Hole Sun | Soundgarden
Alive | Pearl Jam
Plug In Baby | Muse
Starlight | Muse
I Bet You Look Good on the Dancefloor | Arctic Monkeys
505 | Arctic Monkeys
Somebody Told Me | The Killers ~ Killers
The Pretender | Foo Fighters
Learn to Fly | Foo Fighters
American Idiot | Green Day
Wake Me Up When September Ends | Green Day
Boulevard of Broken Dreams | Green Day
All the Small Things | blink-182 ~ Blink 182
Chop Suey! | System of a Down
Bring Me to Life | Evanescence
Last Resort | Papa Roach
Take Me Out | Franz Ferdinand
Last Nite | The Strokes ~ Strokes
Heroes | David Bowie
Space Oddity | David Bowie
Should I Stay or Should I Go | The Clash ~ Clash
London Calling | The Clash ~ Clash
Blitzkrieg Bop | Ramones
Rebel Yell | Billy Idol
Run to the Hills | Iron Maiden
The Trooper | Iron Maiden
Fear of the Dark | Iron Maiden
Ace of Spades | Motörhead
Breaking the Law | Judas Priest
Crazy Train | Ozzy Osbourne
Duality | Slipknot
Freak on a Leash | Korn
Killing in the Name | Rage Against the Machine
Losing My Religion | R.E.M. ~ REM
Johnny B. Goode | Chuck Berry
Jailhouse Rock | Elvis Presley
Rock Around the Clock | Bill Haley & His Comets ~ Bill Haley
Tutti Frutti | Little Richard
Great Balls of Fire | Jerry Lee Lewis
Don't Stop Believin' | Journey
More Than a Feeling | Boston
Here I Go Again | Whitesnake
L'aventurier | Indochine
J'ai demandé à la lune | Indochine
Un jour en France | Noir Désir
Aux sombres héros de l'amer | Noir Désir
La bombe humaine | Téléphone
Cendrillon | Téléphone
Ça (c'est vraiment toi) ~ C'est vraiment toi | Téléphone
J't'emmène au vent | Louise Attaque
Jeune et con | Saez
Respire | Mickey 3D
Lambé an dro | Matmatah
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
Harder, Better, Faster, Stronger ~ Harder Better Faster Stronger | Daft Punk
Da Funk | Daft Punk
Digital Love | Daft Punk
Get Lucky | Daft Punk ~ Pharrell Williams
Love Generation | Bob Sinclar
World, Hold On ~ World Hold On ~ World, Hold On (Children of the Sky) | Bob Sinclar
When Love Takes Over | David Guetta ~ Kelly Rowland
Memories | David Guetta ~ Kid Cudi
Hey Mama | David Guetta
Without You | David Guetta ~ Usher
She Wolf ~ She Wolf (Falling to Pieces) | David Guetta ~ Sia
I'm Good ~ I'm Good (Blue) | David Guetta ~ Bebe Rexha
Hey Brother | Avicii
The Nights | Avicii
Waiting for Love | Avicii
Scared to Be Lonely | Martin Garrix ~ Dua Lipa
In the Name of Love | Martin Garrix ~ Bebe Rexha
Faded | Alan Walker
Feel So Close | Calvin Harris
Blame | Calvin Harris
How Deep Is Your Love | Calvin Harris ~ Disciples
One Kiss | Calvin Harris ~ Dua Lipa
Sweet Nothing | Calvin Harris ~ Florence Welch
Save the World | Swedish House Mafia
Opus | Eric Prydz
Pjanoo | Eric Prydz
Strobe | deadmau5
Ghosts 'n' Stuff | deadmau5
Scary Monsters and Nice Sprites | Skrillex
Bangarang | Skrillex
Get Low | Dillon Francis ~ DJ Snake
Let Me Love You | DJ Snake ~ Justin Bieber
Tsunami | DVBBS ~ Borgeous
Born Slippy ~ Born Slippy .NUXX | Underworld
Block Rockin' Beats | The Chemical Brothers ~ Chemical Brothers
Galvanize | The Chemical Brothers ~ Chemical Brothers
Firestarter | The Prodigy ~ Prodigy
Breathe | The Prodigy ~ Prodigy
Out of Space | The Prodigy ~ Prodigy
Right Here, Right Now ~ Right Here Right Now | Fatboy Slim
The Rockafeller Skank | Fatboy Slim
Teardrop | Massive Attack
Unfinished Sympathy | Massive Attack
Porcelain | Moby
Why Does My Heart Feel So Bad? ~ Why Does My Heart Feel So Bad | Moby
Natural Blues | Moby
Sing It Back | Moloko
Show Me Love | Robin S
Finally | CeCe Peniston
Flat Beat | Mr. Oizo
D.A.N.C.E. ~ DANCE | Justice
We Are Your Friends | Justice ~ Simian
Destination Calabria | Alex Gaudino
Put Your Hands Up for Detroit | Fedde Le Grand
God Is a DJ | Faithless
9 PM (Till I Come) ~ 9 PM ~ Till I Come | ATB
Ecuador | Sash!
Ocean Drive | Duke Dumont
Where Are You Now | Lost Frequencies ~ Calum Scott
Losing It | Fisher
Mr. Vain | Culture Beat
No Limit | 2 Unlimited
Be My Lover | La Bouche
Barbra Streisand | Duck Sauce
We No Speak Americano | Yolanda Be Cool ~ DCUP
Watch Out for This ~ Watch Out for This (Bumaye) | Major Lazer
Prayer in C | Lilly Wood and the Prick ~ Robin Schulz
Blue Monday | New Order
Pump Up the Jam | Technotronic
Midnight City | M83
Stereo Love | Edward Maya ~ Vika Jigulina
Mr. Saxobeat | Alexandra Stan
Dragostea din tei | O-Zone
Rather Be | Clean Bandit ~ Jess Glynne
Miracle | Calvin Harris ~ Ellie Goulding
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
Spring Day | BTS
DNA | BTS
Fake Love | BTS
Idol | BTS
Mic Drop | BTS
LALISA ~ Lalisa | LISA ~ Lisa
Money | LISA ~ Lisa
Flower | JISOO ~ Jisoo
SOLO ~ Solo | JENNIE ~ Jennie
As If It's Your Last | BLACKPINK
Shut Down | BLACKPINK
Lovesick Girls | BLACKPINK
BOOMBAYAH ~ Boombayah | BLACKPINK
Whistle | BLACKPINK
Cheer Up | TWICE
Likey | TWICE
Feel Special | TWICE
MANIAC ~ Maniac | Stray Kids
S-Class | Stray Kids
LALALALA | Stray Kids
After LIKE ~ After Like | IVE
I AM ~ I Am | IVE
ELEVEN ~ Eleven | IVE
OMG | NewJeans
Ditto | NewJeans
Attention | NewJeans
Savage | aespa
Black Mamba | aespa
Whiplash | aespa
Bad Boy | Red Velvet
Red Flavor | Red Velvet
BANG BANG BANG ~ Bang Bang Bang | BIGBANG ~ Big Bang
Haru Haru | BIGBANG ~ Big Bang
Love Shot | EXO
Call Me Baby | EXO
Genie | Girls' Generation ~ SNSD
I Am the Best | 2NE1
Nobody | Wonder Girls
Ring Ding Dong | SHINee
Very Nice | SEVENTEEN ~ Seventeen
Super | SEVENTEEN ~ Seventeen
Sugar Rush Ride | TOMORROW X TOGETHER ~ TXT
Nxde | (G)I-DLE ~ i-dle ~ GIDLE ~ G Idle
TOMBOY ~ Tomboy | (G)I-DLE ~ i-dle ~ GIDLE ~ G Idle
UNFORGIVEN ~ Unforgiven | LE SSERAFIM ~ Le Sserafim
FEARLESS ~ Fearless | LE SSERAFIM ~ Le Sserafim
DALLA DALLA ~ Dalla Dalla | ITZY
Cupid | FIFTY FIFTY ~ Fifty Fifty
Standing Next to You | Jung Kook ~ Jungkook
Like Crazy | Jimin
Daechwita | Agust D
Gentleman | PSY
Kick It | NCT 127
BBoom BBoom ~ Bboom Bboom | MOMOLAND ~ Momoland
Gashina | SUNMI ~ Sunmi
Bling-Bang-Bang-Born | Creepy Nuts
Night Dancer | imase
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
The Power of Love | Huey Lewis and the News ~ Huey Lewis
Footloose | Kenny Loggins
Holding Out for a Hero | Bonnie Tyler
I'm a Believer | Smash Mouth
Circle of Life | Elton John
How Far I'll Go | Auli'i Cravalho
Happy | Pharrell Williams
Can't Stop the Feeling! ~ Can't Stop the Feeling | Justin Timberlake
Goldfinger | Shirley Bassey
Live and Let Die | Wings ~ Paul McCartney ~ Paul McCartney & Wings
Don't You (Forget About Me) | Simple Minds
You're the One That I Want | John Travolta ~ Olivia Newton-John
Summer Nights | John Travolta ~ Olivia Newton-John
Grease | Frankie Valli
The Sound of Silence | Simon & Garfunkel
Everybody's Talkin' | Harry Nilsson ~ Nilsson
Singin' in the Rain | Gene Kelly
Over the Rainbow ~ Somewhere Over the Rainbow | Judy Garland
Raindrops Keep Fallin' on My Head | B.J. Thomas ~ BJ Thomas
Streets of Philadelphia | Bruce Springsteen
Gangsta's Paradise | Coolio
Hooked on a Feeling | Blue Swede
Mr. Blue Sky | Electric Light Orchestra ~ ELO
Come and Get Your Love | Redbone
Ain't No Mountain High Enough | Marvin Gaye ~ Tammi Terrell
Bohemian Rhapsody | Queen
Old Time Rock and Roll ~ Old Time Rock & Roll | Bob Seger
Oh Yeah | Yello
Axel F | Harold Faltermeyer
This Is Me | Keala Settle
The Greatest Show | Hugh Jackman
I Don't Want to Miss a Thing | Aerosmith
What Was I Made For? ~ What Was I Made For | Billie Eilish
I'm Just Ken | Ryan Gosling
Dance the Night | Dua Lipa
Barbie World | Nicki Minaj ~ Ice Spice ~ Aqua
Running Up That Hill | Kate Bush
Bang Bang ~ Bang Bang (My Baby Shot Me Down) | Nancy Sinatra
Stuck in the Middle with You | Stealers Wheel
Little Green Bag | George Baker Selection
Son of a Preacher Man | Dusty Springfield
Girl, You'll Be a Woman Soon ~ Girl You'll Be a Woman Soon | Urge Overkill
Where Is My Mind? ~ Where Is My Mind | Pixies
Bloody Mary | Lady Gaga
Dancing Queen | ABBA
Gimme! Gimme! Gimme! ~ Gimme Gimme Gimme ~ Gimme! Gimme! Gimme! (A Man After Midnight) | ABBA
Reality | Richard Sanderson
Vois sur ton chemin | Les Choristes ~ Bruno Coulais ~ Les Petits Chanteurs de Saint-Marc
La valse d'Amélie | Yann Tiersen
The Pink Panther Theme ~ La Panthère rose ~ The Pink Panther | Henry Mancini
Hedwig's Theme ~ Harry Potter | John Williams
He's a Pirate ~ Pirates des Caraïbes | Klaus Badelt ~ Hans Zimmer
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

// mode Classé : catégories où l'on peut jouer classé. Rotation prévue (4 catégories tirées au sort pour chaque saison,
// les mêmes pour tout le monde pendant la saison) mais pas encore activée à la demande de l'utilisateur : toutes les
// catégories en attendant. Pour l'activer : RANKED_ROTATION = true ici et dans public/index.html.
// override (variable RANKED_CATS, pour les tests en local) : liste fixe « rapfr,rock,… »
export const RANKED_ROTATION = false;
const RANKED_POOL = ['80', '90', '2000', '2010', '2020', 'variete', 'rapfr', 'rapus', 'rock', 'electro', 'kpop', 'cine'];
export function rankedCats(sc, override) {
  if (override) {
    const list = String(override).split(',').map(c => c.trim()).filter(c => CAT_IDS.has(c));
    if (list.length) return list;
  }
  return RANKED_ROTATION ? seasonRotation(sc) : [...CAT_IDS];
}
export function seasonRotation(sc) {
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
