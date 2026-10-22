// Catalogue : une ligne par morceau, « Titre | Artiste », suivi de « | fr » pour un morceau chanté en français.
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
Ella, elle l'a | France Gall | fr
Vacances j'oublie tout | Elegance | fr
Les démons de minuit | Images | fr
Voyage, voyage | Desireless | fr
Joe le taxi | Vanessa Paradis | fr
Toute première fois | Jeanne Mas | fr
Tous les cris les S.O.S. | Daniel Balavoine | fr
Partenaire particulier | Partenaire Particulier | fr
Nuit de folie | Début de Soirée | fr
Cendrillon | Téléphone | fr
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
Marcia Baïla | Les Rita Mitsouko ~ Rita Mitsouko | fr
C'est comme ça | Les Rita Mitsouko ~ Rita Mitsouko | fr
L'aventurier | Indochine | fr
3e sexe ~ 3ème sexe ~ Troisième sexe | Indochine | fr
Week-end à Rome | Étienne Daho | fr
Ouragan | Stéphanie ~ Stéphanie de Monaco | fr
Résiste | France Gall | fr
Babacar | France Gall | fr
Évidemment | France Gall | fr
Il jouait du piano debout | France Gall | fr
Mon mec à moi | Patricia Kaas | fr
Mademoiselle chante le blues | Patricia Kaas | fr
Libertine | Mylène Farmer | fr
Pourvu qu'elles soient douces | Mylène Farmer | fr
Sans contrefaçon | Mylène Farmer | fr
Ça (c'est vraiment toi) ~ C'est vraiment toi | Téléphone | fr
New York avec toi | Téléphone | fr
L'Aziza | Daniel Balavoine | fr
Sauver l'amour | Daniel Balavoine | fr
Mon fils ma bataille | Daniel Balavoine | fr
Encore un matin | Jean-Jacques Goldman | fr
Envole-moi | Jean-Jacques Goldman | fr
Je te donne | Jean-Jacques Goldman ~ Michael Jones | fr
Là-bas | Jean-Jacques Goldman ~ Sirima | fr
Je marche seul | Jean-Jacques Goldman | fr
Elle a fait un bébé toute seule | Jean-Jacques Goldman | fr
Ville de lumière | Gold | fr
Viens boire un p'tit coup à la maison | Licence IV | fr
La danse des canards | J.J. Lionel ~ JJ Lionel | fr
Chacun fait (c'qui lui plaît) ~ Chacun fait c'qui lui plaît | Chagrin d'amour | fr
Musulmanes | Michel Sardou | fr
Être une femme | Michel Sardou | fr
Quelque chose de Tennessee | Johnny Hallyday | fr
Les bêtises | Sabine Paturel | fr
Les sunlights des tropiques | Gilbert Montagné | fr
On va s'aimer | Gilbert Montagné | fr
Désir désir | Laurent Voulzy ~ Véronique Jannot | fr
Belle-Île-en-Mer, Marie-Galante ~ Belle-Île-en-Mer | Laurent Voulzy | fr
Cœur de loup | Philippe Lafontaine | fr
Elle a les yeux revolver | Marc Lavoine | fr
Hélène | Roch Voisine | fr
T'en va pas | Elsa ~ Elsa Lunghini | fr
Boule de flipper | Corynne Charby | fr
Vertige de l'amour | Alain Bashung | fr
Mélissa | Julien Clerc | fr
Né quelque part | Maxime Le Forestier | fr
C'est la ouate | Caroline Loeb | fr
Le bal masqué | La Compagnie Créole | fr
Ça fait rire les oiseaux | La Compagnie Créole | fr
L'amour à la plage | Niagara | fr
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
Foule sentimentale | Alain Souchon | fr
Aïcha | Khaled | fr
La tribu de Dana | Manau | fr
Tomber la chemise | Zebda | fr
Pour que tu m'aimes encore | Céline Dion | fr
Désenchantée | Mylène Farmer | fr
Il me dit que je suis belle | Patricia Kaas | fr
Lucie | Pascal Obispo | fr
Zen | Zazie | fr
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
S'il suffisait d'aimer | Céline Dion | fr
Je sais pas | Céline Dion | fr
On ne change pas | Céline Dion | fr
Tandem | Vanessa Paradis | fr
Be My Baby | Vanessa Paradis
La corrida | Francis Cabrel | fr
Juste quelqu'un de bien | Enzo Enzo | fr
Le temps des cathédrales | Bruno Pelletier | fr
Qui a le droit | Patrick Bruel | fr
Alors regarde | Patrick Bruel | fr
Sensualité | Axelle Red | fr
XXL | Mylène Farmer | fr
Allumer le feu | Johnny Hallyday | fr
Vivre pour le meilleur | Johnny Hallyday | fr
Dieu m'a donné la foi | Ophélie Winter | fr
Né en 17 à Leidenstadt | Fredericks Goldman Jones ~ Jean-Jacques Goldman ~ Carole Fredericks | fr
Dur dur d'être bébé ! ~ Dur dur d'être bébé | Jordy | fr
J't'emmène au vent | Louise Attaque | fr
L'hymne de nos campagnes | Tryo | fr
Lambé an dro | Matmatah | fr
Tu m'oublieras | Larusso | fr
Partir un jour | 2Be3 | fr
Chanter pour ceux qui sont loin de chez eux | Lââm | fr
Il y a trop de gens qui t'aiment | Hélène Ségara | fr
Savoir aimer | Florent Pagny | fr
Didi | Khaled
Ma petite entreprise | Alain Bashung | fr
Saga Africa | Yannick Noah | fr
Je t'aime | Lara Fabian | fr
Un jour en France | Noir Désir | fr
Je danse le mia | IAM | fr
Caroline | MC Solaar | fr
Ma Benz | Suprême NTM ~ NTM | fr
Nirvana | Doc Gynéco | fr
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
Le vent nous portera | Noir Désir | fr
Moi... Lolita ~ Moi Lolita | Alizée | fr
Ma philosophie | Amel Bent | fr
Ma liberté de penser | Florent Pagny | fr
Qui de nous deux | M ~ Matthieu Chedid ~ -M- | fr
La Boulette | Diam's | fr
Parce qu'on vient de loin | Corneille | fr
Le chemin | Kyo | fr
Le dîner | Bénabar | fr
Femme Like U | K-Maro ~ K Maro | fr
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
Seul | Garou | fr
Sous le vent | Garou ~ Céline Dion | fr
Les rois du monde | Roméo et Juliette ~ Damien Sargue ~ Grégori Baquet ~ Philippe d'Avilla | fr
L'envie d'aimer | Les Dix Commandements ~ Daniel Lévi | fr
J'ai demandé à la lune | Indochine | fr
Tout le bonheur du monde | Sinsemilia | fr
Hey Oh | Tragédie | fr
Tu trouveras | Natasha St-Pier ~ Pascal Obispo | fr
1er gaou ~ Premier gaou | Magic System | fr
Bouger bouger | Magic System | fr
J'en ai marre ! ~ J'en ai marre | Alizée | fr
J'ai pas vingt ans | Alizée | fr
On s'attache | Christophe Maé | fr
Mon paradis | Christophe Maé | fr
Face à la mer | Calogero ~ Passi | fr
En apesanteur | Calogero | fr
Caravane | Raphaël | fr
Elle me contrôle | M. Pokora ~ Matt Pokora ~ Pokora | fr
J'attends l'amour | Jenifer | fr
Au soleil | Jenifer | fr
Près de moi | Lorie | fr
Dernière danse | Kyo | fr
Butterfly | Superbus | fr
Dis-moi | BB Brunes | fr
J'traîne des pieds | Olivia Ruiz | fr
Marly-Gomont | Kamini | fr
Ça m'énerve | Helmut Fritz | fr
Comme des enfants | Cœur de pirate | fr
J'aime plus Paris | Thomas Dutronc | fr
Jeune demoiselle | Diam's | fr
Gravé dans la roche | Sniper | fr
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
Formidable | Stromae | fr
Papaoutai | Stromae | fr
Dernière danse | Indila | fr
Je veux | Zaz | fr
Bella | Gims ~ Maître Gims | fr
Djadja | Aya Nakamura | fr
Christine ~ Tilted | Christine and the Queens | fr
Je vole | Louane | fr
Bad Guy | Billie Eilish
Old Town Road | Lil Nas X
Thinking Out Loud | Ed Sheeran
Counting Stars | OneRepublic
Radioactive | Imagine Dragons
Shallow | Lady Gaga ~ Bradley Cooper
Andalouse | Kendji Girac | fr
Tous les mêmes | Stromae | fr
Sapés comme jamais | Gims ~ Maître Gims | fr
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
Wild Ones | Flo Rida ~ Sia
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
Alors on danse | Stromae | fr
Tourner dans le vide | Indila | fr
On ira | Zaz | fr
J'me tire | Gims ~ Maître Gims | fr
Est-ce que tu m'aimes ? ~ Est-ce que tu m'aimes | Gims ~ Maître Gims | fr
La même | Gims ~ Maître Gims ~ Vianney | fr
Copines | Aya Nakamura | fr
Avenir | Louane | fr
Color Gitano | Kendji Girac | fr
Les yeux de la mama | Kendji Girac | fr
Je m'en vais | Vianney | fr
Il est où le bonheur | Christophe Maé | fr
Elle me dit | Mika | fr
Tout oublier | Angèle ~ Roméo Elvis | fr
Désolé | Sexion d'Assaut | fr
J'ai cherché | Amir | fr
Ça va ça vient | Vitaa ~ Slimane | fr
Bim bam toi | Carla | fr
Reine | Dadju | fr
Paris-Seychelles | Julien Doré | fr
La grenade | Clara Luciani | fr
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
Pookie | Aya Nakamura | fr
Jolie nana | Aya Nakamura | fr
Tout va bien | Orelsan | fr
La kiffance | Naps | fr
Ciel | Gims ~ Maître Gims | fr
Mon amour | Slimane | fr
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
Bande organisée | 13 Organisé ~ Jul ~ SCH ~ Naps | fr
Petit génie | Jungeli ~ Imen Es ~ Alonzo | fr
Ma meilleure ennemie | Stromae ~ Pomme | fr
L'enfer | Stromae | fr
Santé | Stromae | fr
Saiyan | Heuss l'Enfoiré ~ Gazo | fr
Die | Gazo | fr
Évidemment | La Zarra | fr
Voilà | Barbara Pravi | fr
Bolide allemand | SDM | fr
Ceux qu'on était | Pierre Garnier | fr
N'y pense plus | Tayc | fr
Le dernier jour du disco | Juliette Armanet | fr
Le reste | Clara Luciani | fr
Triple V | Werenoi ~ Damso ~ Ninho | fr
Dégaine | Aya Nakamura ~ Damso | fr
`,
  'variete': `
Les Champs-Élysées | Joe Dassin | fr
L'été indien | Joe Dassin | fr
Comme toi | Jean-Jacques Goldman | fr
Quand la musique est bonne | Jean-Jacques Goldman | fr
Mistral gagnant | Renaud | fr
Alexandrie Alexandra | Claude François ~ Cloclo | fr
Comme d'habitude | Claude François ~ Cloclo | fr
La vie en rose | Édith Piaf | fr
Non, je ne regrette rien | Édith Piaf | fr
La bohème | Charles Aznavour | fr
Emmenez-moi | Charles Aznavour | fr
Je l'aime à mourir | Francis Cabrel | fr
Désenchantée | Mylène Farmer | fr
Pour que tu m'aimes encore | Céline Dion | fr
Dernière danse | Indila | fr
Je vole | Louane | fr
Tombé sous le charme | Christophe Maé | fr
Allumer le feu | Johnny Hallyday | fr
Que je t'aime | Johnny Hallyday | fr
Foule sentimentale | Alain Souchon | fr
Ne me quitte pas | Jacques Brel | fr
Les lacs du Connemara | Michel Sardou | fr
Le Sud | Nino Ferrer | fr
Je veux | Zaz | fr
Balance ton quoi | Angèle | fr
Ta reine | Angèle | fr
Pas là | Vianney | fr
Andalouse | Kendji Girac | fr
Si seulement je pouvais lui manquer | Calogero | fr
Coco Câline | Julien Doré | fr
Place des grands hommes | Patrick Bruel | fr
Le chanteur | Daniel Balavoine | fr
La Javanaise | Serge Gainsbourg | fr
Paroles, paroles | Dalida | fr
Aline | Christophe | fr
L'aventurier | Indochine | fr
La mer | Charles Trenet | fr
Douce France | Charles Trenet | fr
Y'a d'la joie | Charles Trenet | fr
Les feuilles mortes | Yves Montand | fr
À bicyclette | Yves Montand | fr
Milord | Édith Piaf | fr
L'hymne à l'amour | Édith Piaf | fr
Padam, padam ~ Padam padam | Édith Piaf | fr
La foule | Édith Piaf | fr
Hier encore | Charles Aznavour | fr
For me formidable | Charles Aznavour | fr
Amsterdam | Jacques Brel | fr
La valse à mille temps | Jacques Brel | fr
Le plat pays | Jacques Brel | fr
Les copains d'abord | Georges Brassens | fr
La mauvaise réputation | Georges Brassens | fr
Je t'aime... moi non plus ~ Je t'aime moi non plus | Serge Gainsbourg ~ Jane Birkin | fr
Le poinçonneur des Lilas | Serge Gainsbourg | fr
Je suis venu te dire que je m'en vais | Serge Gainsbourg | fr
Couleur café | Serge Gainsbourg | fr
Laisse tomber les filles | France Gall | fr
Poupée de cire, poupée de son ~ Poupée de cire poupée de son | France Gall | fr
Tous les garçons et les filles | Françoise Hardy | fr
Comment te dire adieu | Françoise Hardy | fr
Le temps de l'amour | Françoise Hardy | fr
La Maritza | Sylvie Vartan | fr
Salut les amoureux | Joe Dassin | fr
Et si tu n'existais pas | Joe Dassin | fr
À toi | Joe Dassin | fr
Siffler sur la colline | Joe Dassin | fr
Belles ! Belles ! Belles ! ~ Belles belles belles | Claude François ~ Cloclo | fr
Magnolias for Ever | Claude François ~ Cloclo | fr
Le téléphone pleure | Claude François ~ Cloclo | fr
Le lundi au soleil | Claude François ~ Cloclo | fr
Bambino | Dalida | fr
Gigi l'amoroso | Dalida | fr
Il venait d'avoir 18 ans | Dalida | fr
La Mamma | Charles Aznavour | fr
Mourir sur scène | Dalida | fr
Salma ya salama | Dalida | fr
Les mots bleus | Christophe | fr
Retiens la nuit | Johnny Hallyday | fr
Gabrielle | Johnny Hallyday | fr
L'envie | Johnny Hallyday | fr
Noir c'est noir | Johnny Hallyday | fr
Je te promets | Johnny Hallyday | fr
Le pénitencier | Johnny Hallyday | fr
La maladie d'amour | Michel Sardou | fr
En chantant | Michel Sardou | fr
Les cornichons | Nino Ferrer | fr
Mirza | Nino Ferrer | fr
Il est cinq heures, Paris s'éveille ~ Il est cinq heures Paris s'éveille | Jacques Dutronc | fr
Et moi, et moi, et moi ~ Et moi et moi et moi | Jacques Dutronc | fr
J'aime les filles | Jacques Dutronc | fr
Petite Marie | Francis Cabrel | fr
L'encre de tes yeux | Francis Cabrel | fr
Laisse béton | Renaud | fr
Dès que le vent soufflera | Renaud | fr
Morgane de toi | Renaud | fr
La groupie du pianiste | Michel Berger | fr
Le paradis blanc | Michel Berger | fr
Et maintenant | Gilbert Bécaud | fr
Nathalie | Gilbert Bécaud | fr
L'important c'est la rose | Gilbert Bécaud | fr
Le métèque | Georges Moustaki | fr
Je suis malade | Serge Lama | fr
SOS d'un terrien en détresse | Daniel Balavoine | fr
La chanson des Restos | Les Enfoirés | fr
Fais-moi une place | Julien Clerc | fr
Ma préférence | Julien Clerc | fr
Femmes... je vous aime ~ Femmes je vous aime | Julien Clerc | fr
Sous le ciel de Paris | Édith Piaf | fr
Un homme heureux | William Sheller | fr
Lettre à France | Michel Polnareff | fr
On ira tous au paradis | Michel Polnareff | fr
Love Me, Please Love Me ~ Love Me Please Love Me | Michel Polnareff | fr
Vous les femmes ~ Vous les femmes (Pobre diablo) | Julio Iglesias | fr
Prendre un enfant | Yves Duteil | fr
Santiano | Hugues Aufray | fr
Jardin d'hiver | Henri Salvador | fr
Laisse-moi t'aimer | Mike Brant | fr
Qui saura | Mike Brant | fr
L'école est finie | Sheila | fr
Spacer | Sheila
Où sont les femmes ? ~ Où sont les femmes | Patrick Juvet | fr
La ballade des gens heureux | Gérard Lenorman | fr
Ça plane pour moi | Plastic Bertrand | fr
Allô maman bobo | Alain Souchon | fr
J'ai dix ans | Alain Souchon | fr
Rockollection | Laurent Voulzy | fr
Amoureuse | Véronique Sanson | fr
San Francisco | Maxime Le Forestier | fr
La montagne | Jean Ferrat | fr
Toulouse | Claude Nougaro | fr
L'aigle noir | Barbara | fr
Une belle histoire | Michel Fugain | fr
Capri c'est fini | Hervé Vilard | fr
Tombe la neige | Adamo ~ Salvatore Adamo | fr
Casser la voix | Patrick Bruel | fr
Envole-moi | Jean-Jacques Goldman | fr
Résiste | France Gall | fr
Mon mec à moi | Patricia Kaas | fr
Hélène | Roch Voisine | fr
Il y a trop de gens qui t'aiment | Hélène Ségara | fr
Seul | Garou | fr
Face à la mer | Calogero ~ Passi | fr
Il est où le bonheur | Christophe Maé | fr
Je m'en vais | Vianney | fr
On ira | Zaz | fr
Paris-Seychelles | Julien Doré | fr
La grenade | Clara Luciani | fr
Le dernier jour du disco | Juliette Armanet | fr
J'ai cherché | Amir | fr
Voilà | Barbara Pravi | fr
Mon amour | Slimane | fr
`,
  'rapfr': `
Basique | Orelsan | fr
La terre est ronde | Orelsan | fr
Caroline | MC Solaar | fr
Bouge de là | MC Solaar | fr
Dommage | Bigflo & Oli | fr
Au DD | PNL | fr
Ma Benz | Suprême NTM ~ NTM | fr
Laisse pas traîner ton fils | Suprême NTM ~ NTM | fr
Petit frère | IAM | fr
Je danse le mia | IAM | fr
Demain c'est loin | IAM | fr
La Boulette | Diam's | fr
DJ | Diam's | fr
Sapés comme jamais | Gims ~ Maître Gims | fr
DKR | Booba | fr
Pitbull | Booba | fr
La vie qu'on mène | Ninho | fr
On verra | Nekfeu | fr
Yeux disent | Lomepal | fr
Avant qu'elle parte | Sexion d'Assaut | fr
Cosmo | Soprano | fr
Journal perso II ~ Journal perso 2 | Vald | fr
Tchikita | Jul | fr
Tonton du bled | 113 | fr
Chocolat | Lartiste | fr
La kiffance | Naps | fr
Réseaux | Niska | fr
Zoo | Kaaris | fr
Sur ma route | Black M | fr
Meuda | Tiakola | fr
Papaoutai | Stromae | fr
Jefe | Ninho | fr
Maman ne le sait pas | Ninho ~ Niska | fr
Macarena | Damso | fr
Feu de bois | Damso | fr
On m'appelle l'ovni | Jul | fr
Bande organisée | 13 Organisé ~ Jul ~ SCH ~ Naps | fr
Deux frères | PNL | fr
Le monde ou rien | PNL | fr
Naha | PNL | fr
Égérie | Nekfeu | fr
San | Orelsan | fr
Défaite de famille | Orelsan | fr
Tout va bien | Orelsan | fr
Validée | Booba | fr
Tchoin | Kaaris | fr
Medellín ~ Medellin | Niska | fr
En feu | Soprano | fr
Clown | Soprano | fr
Désolé | Sexion d'Assaut | fr
Ma direction | Sexion d'Assaut | fr
Plus tard | Bigflo & Oli | fr
Trop beau | Lomepal | fr
Eurotrap | Vald | fr
Mafiosa | Lartiste | fr
Qui est l'exemple ? ~ Qui est l'exemple | Rohff | fr
Gravé dans la roche | Sniper | fr
Jeune demoiselle | Diam's | fr
Ma France à moi | Diam's | fr
L'école du micro d'argent | IAM | fr
Seine-Saint-Denis Style | Suprême NTM ~ NTM | fr
Nouveau western | MC Solaar | fr
Victime de la mode | MC Solaar | fr
Angela | Saïan Supa Crew | fr
Nirvana | Doc Gynéco | fr
RR 9.1 | Koba LaD | fr
Moulaga | Heuss l'Enfoiré ~ Jul | fr
Dalida | Soolking | fr
Suavemente | Soolking | fr
Die | Gazo | fr
Saiyan | Heuss l'Enfoiré ~ Gazo | fr
Triple V | Werenoi ~ Damso ~ Ninho | fr
Bolide allemand | SDM | fr
Marly-Gomont | Kamini | fr
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
Antisocial | Trust | fr
Un autre monde | Téléphone | fr
Uprising | Muse
Supermassive Black Hole | Muse
Do I Wanna Know? | Arctic Monkeys
Mr. Brightside | The Killers ~ Killers
Everlong | Foo Fighters
Basket Case | Green Day
Zombie | The Cranberries ~ Cranberries
Le vent nous portera | Noir Désir | fr
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
L'aventurier | Indochine | fr
J'ai demandé à la lune | Indochine | fr
Un jour en France | Noir Désir | fr
Aux sombres héros de l'amer | Noir Désir | fr
La bombe humaine | Téléphone | fr
Cendrillon | Téléphone | fr
Ça (c'est vraiment toi) ~ C'est vraiment toi | Téléphone | fr
J't'emmène au vent | Louise Attaque | fr
Jeune et con | Saez | fr
Respire | Mickey 3D | fr
Lambé an dro | Matmatah | fr
L'homme pressé | Noir Désir | fr
Tostaky | Noir Désir | fr
Trois nuits par semaine | Indochine | fr
Tes yeux noirs | Indochine | fr
Canary Bay | Indochine | fr
Léa | Louise Attaque | fr
Allumer le feu | Johnny Hallyday | fr
Rock'n'roll attitude ~ Rock 'n' roll attitude | Johnny Hallyday | fr
Le chemin | Kyo | fr
Butterfly | Superbus | fr
Dis-moi | BB Brunes | fr
Hygiaphone | Téléphone | fr
Argent trop cher | Téléphone | fr
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
Alors on danse | Stromae | fr
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
Kids | MGMT
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
Libérée, délivrée | Anaïs Delva | fr
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
Sous l'océan | Henri Salvador | fr
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
    const [tt, aa, lang] = line.split(' | ');
    const t = tt.split(' ~ ').map(s => s.trim());
    const a = aa.split(' ~ ').map(s => s.trim());
    return { k: (a[0] + '|' + t[0]).toLowerCase(), t, a, fr: lang?.trim() === 'fr' };
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
