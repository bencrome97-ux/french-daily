# One-off seed: converts a compact list of Ben's Notion vocabulary into content/vocab.json.
# Later additions are made directly to content/vocab.json by the daily sync.
import json, re, unicodedata, sys

DATA = r"""
# Greetings & Farewells
bonjour|hello||Bonjour, ça va ?|Hello, how are things?
bonsoir|good evening||Bonsoir madame|Good evening, madam
bonne soirée|have a good evening
bonne nuit|good night||Bonne nuit, à demain|Good night, see you tomorrow
bonne journée|have a good day||Merci, bonne journée !|Thanks, have a good day!
bienvenue|welcome||Bienvenue à Paris|Welcome to Paris
enchanté|nice to meet you
à bientôt|see you soon
à demain|see you tomorrow
à plus|see you later
# People & Relationships
la personne|person|f|Une table pour deux personnes|A table for two people
l’ami / l’amie|friend|m/f|Mon ami / mon amie|My friend
le copain|boyfriend / male friend|m
la copine|girlfriend / female friend|f
le rencard|date (romantic)|m
le bébé|baby|m|J’ai un bébé|I have a baby
l’enfant|child|m|Il a des enfants ?|Does he have children?
l’invité / l’invitée|guest|m/f
# Family
la famille|family|f
la mère / la maman|mother / mum|f
le père|father|m
le frère|brother|m
la sœur|sister|f
la femme|wife / woman|f
le mari|husband|m
la fille|daughter / girl|f
le fils|son|m
la grand-mère|grandmother|f
le grand-père|grandfather|m
l’oncle|uncle|m
la tante|aunt|f
le neveu|nephew|m
la nièce|niece|f
le cousin / la cousine|cousin|m/f
# Celebrations & Events
l’anniversaire|birthday|m|Bon anniversaire !|Happy birthday!
la fête|party|f
le gâteau|cake|m
le cadeau|gift|m
la lune de miel|honeymoon|f
la surprise|surprise|f
# Travel & Transport
le train|train|m|Je prends le train|I take the train
la gare|train station|f|La gare est là-bas|The station is over there
le métro|underground / metro|m
le bus|bus|m
le taxi|taxi|m
la voiture|car|f
le vélo|bike|m
l’avion|plane|m|L’avion part à midi|The plane leaves at midday
le vol|flight (also theft)|m
l’aéroport|airport|m
la station|station (metro)|f|La station de métro|The metro station
le billet|ticket|m|Un billet aller-retour|A return ticket
le billet d’avion|plane ticket|m
le passeport|passport|m
la valise|suitcase|f|Ma valise est lourde|My suitcase is heavy
l’hôtel|hotel|m
les vacances|holiday|pl
les indications|directions|pl
le plan|map|m
# Places & City
la ville|city / town|f
la capitale|capital|f
la rue|street|f
le parc|park|m
la plage|beach|f
le magasin|shop|m
le supermarché|supermarket|m|Je vais au supermarché|I’m going to the supermarket
la boulangerie|bakery|f
la banque|bank|f
l’hôpital|hospital|m
la pharmacie|pharmacy|f
le cinéma|cinema|m
le zoo|zoo|m
le musée|museum|m
la piscine|swimming pool|f
l’église|church|f
le château|castle|m|Le château de Versailles|The Palace of Versailles
la sortie|exit|f
l’entrée|entrance / starter|f
la campagne|countryside|f
le quartier|neighbourhood|m
# Eating Out
le restaurant|restaurant|m|Le restaurant est fermé|The restaurant is closed
le café|café / coffee|m|Je voudrais un café|I would like a coffee
le comptoir|counter|m
la table|table|f|Une table pour deux|A table for two
le serveur / la serveuse|waiter / waitress|m/f
la carte|menu|f|Voici votre carte|Here is your menu
le plat principal|main course|m
le dessert|dessert|m
l’addition|bill|f
le verre|glass|m
la tasse|cup|f
la bouteille|bottle|f
le petit déjeuner|breakfast|m
le déjeuner|lunch|m
le dîner|dinner|m
en espèces|in cash||Tu paies en espèces ou par carte ?|Are you paying in cash or by card?
par carte|by card
le repas|meal|m
# Food & Drink
l’eau minérale|mineral water|f
l’eau gazeuse|sparkling water|f
l’eau plate|still water|f
la limonade|lemonade|f
le jus|juice|m
le thé|tea|m
la tisane|herbal tea|f
le lait|milk|m
le lait d’avoine|oat milk|m
la bière|beer|f
le vin|wine|m
l’orange|orange|f
la pomme|apple|f
le citron|lemon|m
le citron vert|lime|m
le pamplemousse|grapefruit|m
le pois|pea|m
la pomme de terre|potato|f
la salade|salad|f
le fromage|cheese|m
le poulet|chicken|m
le poisson|fish|m
le pain|bread|m
le pain grillé|toast|m
le sandwich|sandwich|m
le croissant|croissant|m
le chocolat|chocolate|m
la crêpe|crepe|f
la glace|ice cream / ice / mirror|f
végétarien / végétarienne|vegetarian||Je suis végétarien|I am vegetarian
le sucre|sugar|m
la farine|flour|f
# Crockery
l’assiette|plate|f|L’assiette est sur la table|The plate is on the table
le couteau|knife|m
la fourchette|fork|f
la cuillère|spoon|f
la serviette|napkin / towel|f
# Work & School
le travail|work|m
le bureau|office|m|Je travaille au bureau|I work at the office
l’école|school|f
le livre|book|m
le professeur / la professeure|teacher|m/f
l’étudiant / l’étudiante|student|m/f
le rendez-vous|appointment|m
le vendeur / la vendeuse|salesperson|m/f
le chauffeur|driver|m
le médecin|doctor|m
le coiffeur / la coiffeuse|hairdresser|m/f
le / la collègue|colleague|m/f
la pause|break|f
la réunion|meeting|f
les devoirs|homework|pl
le chef / la cheffe|boss|m/f
l’agenda|planner / diary|m
le stylo|pen|m
l’entreprise|company|f
le métier|profession / trade|m
l’avocat / l’avocate|lawyer (also avocado)|m/f
l’ingénieur / l’ingénieure|engineer|m/f
le lycée|high school|m
la salle de classe|classroom|f
le cours|class / course|m
le cahier|notebook|m
la leçon|lesson|f
la géographie|geography|f
le journal intime|diary (personal)|m
# Home & Life
la maison|house|f
l’appartement|apartment|m
la porte|door|f
la fenêtre|window|f
la chaise|chair|f
le tabouret|stool|m
le salon|living room|m
le canapé|sofa|m
la cuisine|kitchen|f
le placard|cupboard|m
le frigo|fridge|m
l’évier|kitchen sink|m
la salle à manger|dining room|f
la salle de bain|bathroom|f
les toilettes|toilets|pl|Où sont les toilettes ?|Where are the toilets?
le lavabo|washbasin|m
la chambre|bedroom|f
le lit|bed|m
le jardin|garden|m
l’arbre|tree|m|Il y a un arbre|There is a tree
la plante|plant|f
le voisin / la voisine|neighbour|m/f
le vase|vase|m
# Hobbies & Leisure
la musique|music|f
la chanson|song|f
les jeux|games|pl
la sculpture|sculpture|f
l’émission|show / programme|f
la natation|swimming|f
le podcast|podcast|m|J’ai écouté un podcast|I listened to a podcast
# Nature & Weather
le soleil|sun|m
le lac|lake|m
le temps|weather / time|m|Quel temps fait-il ?|What’s the weather like?
la mer|sea|f
la fleur|flower|f
le paysage|landscape|m
la pluie|rain|f|Il pleuvait|It was raining
# Clothing & Accessories
le pull|jumper|m|Un pull en laine|A wool jumper
la veste|jacket|f
le manteau|coat|m|Mon manteau est chaud|My coat is warm
la chemise|shirt|f
le short|shorts|m
le pantalon|trousers|m|Un pantalon noir|Black trousers
la poche|pocket|f
la robe|dress|f
la cravate|tie|f
la ceinture|belt|f
les chaussures|shoes|pl
le sac|bag|m|Mon sac est lourd|My bag is heavy
le sac à dos|backpack|m
le portefeuille|wallet|m|J’ai perdu mon portefeuille|I lost my wallet
la clé|key|f|Où sont mes clés ?|Where are my keys?
les lunettes de soleil|sunglasses|pl
le casque|helmet / headphones|m
# Everyday Objects
le portable|mobile phone|m
l’idée|idea|f
la couleur|colour|f
le chargeur|charger|m
la chose|thing|f
l’aide|help|f
la vie|life|f|La vie est belle|Life is beautiful
la santé|health|f
l’énergie|energy|f
le plaisir|pleasure|m|Avec plaisir|With pleasure
l’euro|euro|m
le repos|rest|m
le souci|worry|m
le choix|choice|m
la faim|hunger|f
la soif|thirst|f
la part|slice / share|f|Une part de gâteau|A slice of cake
le nom|name / surname|m
le prénom|first name|m
la réservation|reservation|f
le mystère|mystery|m
# Animals
l’animal de compagnie|pet|m
le chien|dog|m
le chat|cat|m
le cheval|horse|m|Les chevaux|Horses (plural)
la chouette|owl|f
le renard|fox|m
la cigale|cicada|f
l’oie|goose|f
le dinosaure|dinosaur|m
# Body
le visage|face|m
l’œil / les yeux|eye / eyes|m
l’oreille|ear|f
la bouche|mouth|f
le nez|nose|m
la dent|tooth|f
le bras|arm|m
l’avant-bras|forearm|m
les taches de rousseur|freckles|pl
la main|hand|f
# Time & Days
l’heure|hour / time|f|Quelle heure est-il ?|What time is it?
le jour|day|m
la journée|day (the whole day)|f|Tu as passé une bonne journée ?|Did you have a good day?
cette nuit|tonight / last night
le matin|morning|m
l’après-midi|afternoon|m
le soir|evening|m
le week-end|weekend|m
l’été|summer|m
# Numbers
zéro|0
un / une|1
deux|2
trois|3
quatre|4
cinq|5
six|6
sept|7
huit|8
neuf|9
dix|10
onze|11
douze|12
treize|13
quatorze|14
quinze|15
seize|16
dix-sept|17
dix-huit|18
dix-neuf|19
vingt|20
trente|30
quarante|40
cinquante|50
soixante|60
soixante-dix|70
quatre-vingts|80
quatre-vingt-dix|90
cent|100
mille|1000
# Countries
le pays|country|m
la France|France|f|Je suis en France|I am in France
l’Angleterre|England|f|J’habite en Angleterre|I live in England
le Mexique|Mexico|m|Je vais au Mexique|I’m going to Mexico
le Japon|Japan|m
le Brésil|Brazil|m
le Sénégal|Senegal|m
le Canada|Canada|m
les États-Unis|United States|pl|Je vais aux États-Unis|I’m going to the United States
l’Italie|Italy|f
la Suisse|Switzerland|f
la Chine|China|f
l’Allemagne|Germany|f
l’Espagne|Spain|f|Je viens d’Espagne|I come from Spain
Londres|London
# Colours
noir / noire|black||Un pantalon noir|Black trousers
vert / verte|green
violet / violette|purple
rose|pink
bleu / bleue|blue
# Sport
le sport|sport|m
le match|match|m
l’équipe|team|f
le joueur / la joueuse|player|m/f
le ballon|ball|m
à la télé|on TV||Je regarde le match de foot à la télé|I watch the football match on TV
le stade|stadium|m
le foot|football|m
le rugby|rugby|m
"""

PHRASES = r"""
# Phrases: Small Talk
ça va ?|how are things?||Ça va bien, merci|Things are going well, thanks
comment ça va ?|how are things?
comment vas-tu ?|how are you? (informal)
comment allez-vous ?|how are you? (formal)
tu vas bien ?|are you doing well?
ça va bien, merci|things are going well, thanks
ça ne va pas|things aren’t going well
je suis en forme|I’m feeling good
et toi ?|and you?
je viens de Londres|I come from London
comment tu t’appelles ?|what’s your name?
à vendredi|see you on Friday
tu es de quelle ville ?|what city are you from?
tu fais quoi comme travail ?|what do you do for work?
tu vas où ?|where are you going?
tu viens d’où ?|where do you come from?
j’espère que tu as bien dormi|I hope you slept well
# Phrases: Pointing Things Out
c’est mon sac|it’s my bag
ce sont mes clés|these are my keys
c’est tout ?|is that all?
voici mon passeport|here is my passport
qu’est-ce que c’est ?|what is it?
# Phrases: Politeness
s’il vous plaît|please (formal)
s’il te plaît|please (informal)
d’accord|OK
je suis désolé|I’m sorry
comment ?|pardon? / what?
merci beaucoup|thank you very much
bon voyage|have a good trip
passez une bonne journée|have a good day (formal)
joyeux anniversaire|happy birthday
de rien|you’re welcome
bon appétit|enjoy your meal
mince !|darn!
pas de souci|no worries
santé !|cheers!
# Phrases: Reactions
vraiment ?|really?
trop bien|awesome
c’est super|it’s great
pas du tout|not at all
n’est-ce pas ?|isn’t it? / right?
ouf|phew
attention !|watch out!
miam|yum
tu as fait le bon choix|you made the right choice
tu trouves ?|you think so?
j’aime ça|I like that
c’est génial|that’s great
# Phrases: Wants & Needs
je voudrais un café|I would like a coffee
voulez-vous un café ?|do you want a coffee? (formal)
j’ai besoin d’aide|I need help
tu peux m’aider ?|can you help me?
j’ai faim|I’m hungry
j’ai soif|I’m thirsty
j’ai chaud|I’m hot
j’ai froid|I’m cold
donne-moi ma valise|give me my suitcase
# Phrases: Questions
est-ce que tu aimes le jazz ?|do you like jazz?
quoi d’autre ?|what else?
autre chose ?|anything else?
où sont les enfants ?|where are the children?
quel temps fait-il aujourd’hui ?|what’s the weather like today?
# Phrases: Saying No
je ne sais pas|I don’t know
je ne suis pas étudiant|I’m not a student
pas de problème|no problem
je n’ai aucune idée|I have no idea
vous n’êtes pas|you are not
nous n’avons pas|we don’t have
# Phrases: Out & About
un café à emporter|a coffee to take away
le café est à trois minutes|the café is three minutes away
pas cher|cheap
à pied|on foot
à vélo|by bike
je fais du vélo|I cycle
on y va|let’s go
allons-y|let’s go
d’abord|first of all
en ce moment|at the moment
de temps en temps|from time to time
à la maison|at home
tout de suite|right away
# Phrases: Affection
je t’aime|I love you
je t’aime bien|I like you (as a friend)
je t’adore|I adore you
repose-toi bien|get some good rest
va-t’en|go away
# Phrases: The Past
je suis arrivé à Paris|I arrived in Paris
bien arrivé|arrived safely
je suis retourné au magasin|I went back to the shop
c’était une journée difficile|it was a hard day
j’ai écouté un podcast|I listened to a podcast
je me suis couché|I went to bed
j’ai mis du temps à me lever|it took me a while to get up
il pleuvait|it was raining
elle m’a dit|she told me
"""

def slug(s):
    s = s.split(' / ')[0]
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = s.lower().replace('’', '-').replace("'", '-').replace('œ', 'oe')
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s

out, ids = [], set()
def parse(block, kind_default):
    cat = None
    for line in block.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith('#'):
            cat = line[1:].strip()
            continue
        parts = line.split('|') + [''] * 5
        fr, en, g, exfr, exen = [p.strip() for p in parts[:5]]
        kind = kind_default
        if kind == 'word':
            if g in ('m', 'f'):
                kind = 'noun'
        item = {'id': '', 'fr': fr, 'en': en, 'cat': cat, 'kind': kind}
        if g: item['g'] = g
        if exfr: item['ex'] = {'fr': exfr, 'en': exen}
        base = ('p-' if kind == 'phrase' else '') + slug(fr)
        i, n = base, 2
        while i in ids:
            i = f'{base}-{n}'; n += 1
        ids.add(i)
        item['id'] = i
        out.append(item)

parse(DATA, 'word')
parse(PHRASES, 'phrase')
for item in out:
    if item['cat'].startswith('Phrases: '):
        pass
with open(sys.argv[1], 'w') as f:
    f.write('[\n' + ',\n'.join(json.dumps(x, ensure_ascii=False) for x in out) + '\n]\n')
print(len(out), 'items')
