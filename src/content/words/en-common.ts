// Common English words, compiled for Typix (original list, no third-party licence).
// Includes enough home-row-only words (a s d f g h j k l) for a beginner's first sessions.
// Kept free of slurs and profanity; check new additions by hand.

const text = `
a as ad add all ask sad dad lad had has hall half gash dash flash shall lag gas flag fall glad flask
salad lash slash glass lass sash hash ash jag sag fad gall alas falls flags asks adds halls dads
the be to of and in that have it for not on with he you do at this but his by from they we say her
she or an will my one would there their what so up out if about who get which go me when make can
like time no just him know take people into year your good some could them see other than then now
look only come its over think also back after use two how our work first well way even new want
because any these give day most us is was are been were did made said used found called came went
long little very still own world life where while should home off last never left under many must
through around place hand high keep start might great old young big small every next same right
point part number find thing again help show line large turn ask need house world school family
city water room light night story fact book word page money week month idea area power study game
fight strike guard block dodge parry combo round match final boss arena speed focus calm steady
practice lesson finger hands row key keys type typing train learn skill rhythm flow sharp quick
clear clean simple plain short open close early late fast slow free full half kind best better
real true sure ready able each both few more less much such those whole often always sometimes
together already almost enough later today tomorrow above below between before during without
within across behind beyond along against toward among since until though although however yet
begin began begun bring brought build built buy carry catch caught change check choose chose cut
draw drew drive drove eat fall feel felt fill fly follow forget form grow grew hear held hold hope
hurt join jump kept laugh lay lead learned leave let lie live lose lost love meet met move named
note offer pay pick plan play pull push put reach read remember rest return rise run save seem
sell send set shake share shine shot sit sleep speak spend stand stay step stop study talk teach
tell test thank throw touch travel trust try understand wait walk wash watch wear win wish wonder
write wrote answer air animal apple arm art baby bag ball band bank bed bird blue boat body bone
box boy bread bridge brother brown cake car card care cat center chair child class clock cloud
coat cold color corner country course cup dark desk dinner dog door dream dress earth east edge
egg end energy face farm field fire fish floor flower food foot forest friend front fruit garden
girl glass gold grass green ground group hair head heart hill horse hour ice island job land
leg letter list lunch map market metal milk mind minute moon morning mother mountain music name
nature neck north nose ocean office paper park party path peace pen pencil phone picture piece
plant plate pocket pool rain river road rock roof rule salt sand sea seat shape sheep ship shirt
shoe shop side sign silver sister size sky snow song sound south space spring square star stone
street summer sun table tail team tea tree truck uncle valley voice wall war west wheel wind
window winter wood yard yellow zone again agree allow appear apply argue arrive attack avoid
balance base basic bear beat beauty bit black blood board bottom brain branch break breath
bright broad brush burn busy calm camp capital captain cause chance chapter charge cheap chief
circle claim climb coast coffee collect common company compare complete control cook copy cost
count cover crash create cross crowd cry current dance danger data deal deep degree depend
design detail develop direct discover distance divide double doubt drop dry duty eager earn
easy effect effort eight either else enemy engine enjoy enter equal escape event exact example
except exercise expect experience explain express extra fair faith famous far fear feature few
figure film finish fit five fix flat floor force forward four frame fresh fuel future gain gather
gentle gift glance goal grade grand grant gray guess guide habit happen happy hard heavy height
hero hide history hit honest huge human hundred hunt ideal image impact include index inside
instead iron item journey judge jungle junior just justice keen kid kitchen knee knife knock
label lack lake language laser layer lazy leader lean least level lift limit link liquid load
local lock logic loose loud low lucky machine main major manage manner mark master material matter
maybe measure medal member memory mental method middle mild million minor mirror miss mix model
modern moment motion mouse mouth narrow nation near neat nerve network noble noise normal novel
object ocean odd online orange order origin outer owner pace pack pain pair panel parent pass
past pattern pause peak perfect period person phase phrase pilot pitch pixel plain planet please
plenty plus poem polite pool popular port position pound pour praise press pretty price pride
prime print prize problem process produce program project proof proper protect proud public
pulse pure purpose puzzle quality quarter queen question quiet quite quote race radio raise
range rapid rare rate raw reason record reduce region relax rely remain repeat reply report
result rich ride ring risk rival robot role rough route royal rush safe sail sample scale scene
score screen script search season second secret section select sense series serve settle seven
shadow shelf shift shine shore signal silent silk single sister skin slide slight smart smile
smooth soft solid solve sort soul source spare spark special spell spirit split sport spot staff
stage stair steel stick still storm straight strange stream strength stress string strong style
subject success sudden sugar suit supply support surface sweet swift swing symbol system target
task taste tax tempo tend term text theme theory thick thin third threat three thumb ticket tide
tight tiny title tone tool top topic total tough tower trace track trade trail trick trip tune
twice type union unit upper urban usual value vast verse view visit vital wake warm warn wave
weak weather weight wide wild wise wolf worth yard yield zero
`;

/** Unique words, in first-seen order. */
export const enCommonWords: readonly string[] = [...new Set(text.split(/\s+/).filter(Boolean))];
