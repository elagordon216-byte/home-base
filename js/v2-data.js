// Extracted from home-base-v2.html so task text, XP, and gold catalogs stay exact.
export const LIST_GROUPS = ['morning', 'home', 'laundry', 'author', 'evening'];
export const DEFAULT_LISTS = {
  morning: [['m-dressed', 'Get myself dressed and ready', 1], ['m-kids', 'Get kids dressed / basic care', 1], ['m-breakfast', 'Breakfast and drinks for everyone', 1], ['m-preschool', 'Preschool bag and drop-off (if applicable)', 1]],
  home: [['h-dishes', 'Dishes and kitchen reset', 1], ['h-dirty-load', 'Start or advance one dirty laundry load', 1], ['h-main-clean', 'Today’s main cleaning task', 1], ['h-reset', '10-minute reset / clear walkways', 1]],
  laundry: [['l-washer', 'Check washer / move load along', 1], ['l-dryer', 'Check dryer', 1], ['l-empty-basket', 'Empty one clean basket completely', 2], ['l-sort', 'Sort loose clean laundry into family baskets', 1]],
  author: [['a-open', 'Open {priority} and begin', 2], ['a-10', '10-minute focused block', 2], ['a-25', '25-minute focused block', 2], ['a-another', 'Another focused block (optional)', 2], ['a-save', 'Save work and leave a next-step note', 1]],
  evening: [['e-dinner', 'Dinner cleanup and leftovers away', 1], ['e-kitchen', 'Kitchen reset', 1], ['e-toys', 'Five-minute toy/clutter pickup', 1], ['e-prep', 'Prepare essentials for tomorrow', 1], ['e-machines', 'Check laundry machines', 1], ['e-bedtime', 'Kids’ bedtime', 1], ['e-shutdown', 'Personal shutdown and rest', 1]]
};
// The old "Admin & appointments" checklist reset every day; these are now carry-over to-dos.
export const LEGACY_ADMIN = [['t-gp', 'Call GP / handle GP appointment'], ['t-dentist', 'Call dentist / handle dentist appointment'], ['t-eye', 'Call eye doctor'], ['t-resched', 'Reschedule appointments'], ['t-print', 'Print Character-Specific chapters']];
export const BADDAY_ITEMS = [['bd-kids', 'Kids safe and fed'], ['bd-dishes', 'Dishes OR laundry handled'], ['bd-food', 'Something edible available'], ['bd-self', 'One self-care action']];
export const EF_BONUSES = [
  ['ef-transition', '🚪 Transition started', 2], ['ef-initiation', '▶️ Task initiation', 2], ['ef-restart', '🔁 Restarted after interruption', 2],
  ['ef-timer', '⏲️ Used a timer / beat time-blindness', 2], ['ef-sensory', '🎧 Sensory accommodation', 2], ['ef-help', '🤝 Asked for help', 2],
  ['ef-nearly', '💪 Nearly gave up — kept going', 3], ['ef-juststart', '👣 Just start (1 tiny step)', 1], ['ef-respawn', '🌱 Respawn after a hard stretch', 2]
];
export const defaultBaskets = ['My basket', 'Husband’s basket', 'Older child’s basket', 'Baby’s basket', 'Towels / blankets / bedding'];
export const projectStages = ['Idea / brainstorming', 'Outlining / planning', 'Drafting', 'Developmental editing', 'Revision', 'Line editing', 'Copyediting / proofreading', 'Beta readers / feedback', 'Querying / submission', 'Publishing preparation', 'Published / ongoing', 'On hold', 'Complete'];
export const MILESTONES = [0, 100, 250, 500, 750, 1000, 1500, 2000];
export const TIMER_MILESTONES = [30, 60, 90, 120];
export const NO_WRITE_KINDS = ['tuesday', 'sunday', 'sick'];
export const KIND_NAMES = { normal: 'Regular day', fallbreak: 'Fall break / no preschool', sick: 'Sick day', tuesday: 'Tuesday (no writing)', sunday: 'Sunday (no writing)', custom: 'Custom day' };
export const seasonalCatalog=[
 {id:'samhain-candle',name:'Samhain Window Candle',cost:12,season:'Samhain',desc:'A warm amber glow for a cozy autumn window.'},
 {id:'ancestor-shelf',name:'Remembrance Shelf',cost:28,season:'Samhain',desc:'A small dedicated place for photos, keepsakes, or memories.'},
 {id:'autumn-wreath',name:'Autumn Door Wreath',cost:22,season:'Samhain',desc:'Leaves, berries, and welcoming seasonal color.'},
 {id:'winter-throw',name:'Yule Hearth Throw',cost:35,season:'Yule',desc:'A soft blanket for family reading and quiet evenings.'},
 {id:'evergreen-garland',name:'Evergreen Garland',cost:25,season:'Yule',desc:'A little evergreen magic for the mantel or shelf.'},
 {id:'star-lantern',name:'Solstice Star Lantern',cost:30,season:'Yule',desc:'A starry light for the longest night.'},
 {id:'seedling-pot',name:'Imbolc Seedling Pot',cost:18,season:'Imbolc',desc:'A pot for a real or pretend new beginning.'},
 {id:'hearth-basket',name:'Hearth & Bread Basket',cost:24,season:'Imbolc',desc:'A useful basket for bread, yarn, or daily essentials.'},
 {id:'spring-herbs',name:'Spring Herb Planter',cost:32,season:'Ostara',desc:'A little green corner for herbs or seedlings.'},
 {id:'flower-cushion',name:'Beltane Flower Cushion',cost:26,season:'Beltane',desc:'A bright, floral soft furnishing.'},
 {id:'summer-lantern',name:'Litha Sun Lantern',cost:28,season:'Litha',desc:'A sunny accent for a bright room.'},
 {id:'harvest-bowl',name:'Lammas Harvest Bowl',cost:20,season:'Lammas',desc:'A bowl for fruit, bread, or everyday odds and ends.'},
 {id:'autumn-blanket',name:'Mabon Harvest Blanket',cost:40,season:'Mabon',desc:'A comforting seasonal layer for the sofa.'},
 {id:'houseplant',name:'Houseplant',cost:20,season:'Any season',desc:'A small green upgrade for a shelf or windowsill.'},
 {id:'book-nook',name:'Reading Nook Upgrade',cost:45,season:'Any season',desc:'A cushion, lamp, or small improvement for your reading spot.'},
 {id:'storage-basket',name:'Pretty Storage Basket',cost:25,season:'Any season',desc:'A useful home for yarn, toys, or household bits.'}
];
export const lunarPhaseData={
  'new':{title:'Set intentions and make space for a fresh cycle.',tasks:[['pause','Pause and notice what you want to invite into this cycle.'],['intention','Write one clear, realistic intention.'],['seed','Choose one tiny first step you can take this week.'],['release','Clear one small physical or mental space for a fresh start.'],['reflect','Record a sentence about what you are beginning.'] ]},
  'waxing-crescent':{title:'Nurture beginnings with small, steady actions.',tasks:[['review','Review your New Moon intention, or choose one if you are starting here.'],['first-step','Take one small action toward that intention.'],['resources','Identify one resource, person, or habit that could help.'],['encourage','Write down one thing that is already growing.'],['journal','Record a brief observation or card-pull reflection.'] ]},
  'first-quarter':{title:'Meet friction with a practical decision and focused effort.',tasks:[['obstacle','Name one obstacle or decision asking for attention.'],['choose','Choose the next actionable step rather than solving everything.'],['act','Spend 5–15 minutes taking that step.'],['boundary','Set one helpful boundary or adjust a plan.'],['review','Note what you learned from taking action.'] ]},
  'waxing-gibbous':{title:'Refine, prepare, and make useful adjustments.',tasks:[['progress','Review progress toward your current intention.'],['refine','Improve one detail or adjust an unrealistic expectation.'],['prepare','Prepare one tool, space, or resource for the next step.'],['ask','Ask for feedback or identify a useful perspective.'],['gratitude','Acknowledge one piece of progress, however small.'] ]},
  'full':{title:'Notice what has come to light; celebrate, share, or release.',tasks:[['observe','Pause and notice what feels especially clear right now.'],['celebrate','Acknowledge one effort or result you are proud of.'],['share','Share appreciation or connect with someone, if desired.'],['release','Choose one expectation or habit you are ready to loosen.'],['reflect','Journal, pull a card, or reflect on what this cycle has shown you.'] ]},
  'waning-gibbous':{title:'Integrate lessons, express gratitude, and share what you have learned.',tasks:[['lesson','Name one lesson from recent effort or experience.'],['gratitude','Record something you appreciate or that helped you.'],['share','Pass along a useful insight, or simply acknowledge support.'],['integrate','Choose one lesson to carry into your routine.'],['rest','Make room for recovery after a busy stretch.'] ]},
  'last-quarter':{title:'Reassess, declutter, and make space for change.',tasks:[['review','Review what is working and what is not.'],['declutter','Release, delete, tidy, or finish one small thing.'],['boundary','Identify one boundary or change that would help.'],['forgive','Offer yourself a little compassion for what remains unfinished.'],['adjust','Choose one thing to do differently next cycle.'] ]},
  'waning-crescent':{title:'Rest, restore, and gently close out the cycle.',tasks:[['slow','Choose a lower-demand pace where possible.'],['close','Close one small open loop, or consciously defer it.'],['cleanse','Refresh one small space or take a grounding breath.'],['rest','Plan a restorative pause without needing to earn it.'],['reflect','Write one sentence about what you are ready to leave behind.'] ]}
};
export const sabbatData={
  samhain:{title:'Remember, release, and welcome the turning of the year.',tasks:[['intention','Choose a simple intention for remembrance, release, or renewal.'],['remembrance','Prepare a remembrance note, story, or quiet moment for loved ones.'],['decor','Choose one autumnal or meaningful decoration.'],['food','Plan a seasonal meal, bread, or treat that fits your energy.'],['light','Prepare a safe candle or LED light, if desired.'],['family','Choose an optional cozy story, craft, or family activity.'],['close','Plan one gentle post-celebration reset or storage step.']]},
  yule:{title:'Welcome the returning light with warmth, rest, and connection.',tasks:[['intention','Choose a theme of light, hope, rest, or renewal.'],['light','Prepare a candle or safe light-centered moment.'],['greenery','Gather evergreen, natural materials, or reusable seasonal decor.'],['food','Plan a cozy seasonal meal, bake, or warm drink.'],['tradition','Choose a simple tradition to repeat or begin.'],['family','Plan an optional story, craft, music, or family activity.'],['close','Make a low-pressure plan for packing away seasonal items.']]},
  imbolc:{title:'Welcome early signs of spring and tend what is beginning.',tasks:[['intention','Choose an intention around renewal, inspiration, or tending.'],['light','Prepare a small light or candle moment, if desired.'],['refresh','Refresh one small shelf, desk, or meaningful home space.'],['seeds','Check seeds, plants, or a spring-growing idea.'],['food','Choose a simple seasonal food, bread, or treat.'],['craft','Make or plan one small white, green, or spring-themed craft.'],['reflect','Write one sentence about what you want to nurture.']]},
  ostara:{title:'Celebrate balance, growth, and the arrival of spring.',tasks:[['intention','Choose a growth or balance intention.'],['nature','Plan a short nature observation or walk, if practical.'],['planting','Check supplies for planting, seeds, or plant care.'],['decor','Make or display one spring decoration.'],['food','Plan a fresh, seasonal meal or treat.'],['family','Choose an optional nature, egg, or spring craft activity.'],['reflect','Record one thing you hope to help grow this season.']]},
  beltane:{title:'Celebrate vitality, creativity, connection, and flourishing life.',tasks:[['intention','Choose an intention for joy, creativity, or connection.'],['flowers','Gather flowers, greenery, or a nature-inspired decoration.'],['space','Prepare one small festive or outdoor space.'],['food','Plan a seasonal treat, picnic, or shared meal.'],['craft','Choose a ribbon, flower, fiber, or color-themed craft.'],['connection','Plan a meaningful moment with family or community.'],['safety','Check practical needs for outdoor activities and fire safety, if relevant.']]},
  litha:{title:'Mark the height of the light with gratitude and outdoor awareness.',tasks:[['intention','Choose a summer intention around energy, joy, or gratitude.'],['sunlight','Plan a safe, comfortable moment outdoors or near a window.'],['nature','Notice a local plant, tree, or seasonal change.'],['food','Choose a summery meal, fruit, drink, or treat.'],['decor','Add one sun, flower, or nature-inspired detail.'],['family','Plan an optional outdoor or water-play activity suited to your household.'],['rest','Make a heat-aware plan for shade, hydration, and rest.']]},
  lammas:{title:'Honor first harvests, skills, nourishment, and what your effort has grown.',tasks:[['intention','Name something you are cultivating or grateful to harvest.'],['bread','Plan or bake bread, a grain-based food, or a simple treat.'],['harvest','Use seasonal produce or notice what is growing locally.'],['craft','Choose a grain, basket, fiber, or harvest-themed craft.'],['gratitude','Record a skill learned or effort that has borne fruit.'],['share','Plan an optional act of sharing food, time, or knowledge.'],['close','Choose one small way to store, preserve, or tidy supplies.']]},
  mabon:{title:'Reflect on balance, gratitude, harvest, and preparation for rest.',tasks:[['intention','Choose a gratitude or balance intention.'],['harvest','Plan a seasonal meal or use produce already available.'],['gratitude','List a few things, people, or efforts you appreciate.'],['home','Prepare one small autumnal home detail.'],['preserve','Consider a simple food-prep or storage task, only if useful.'],['family','Choose an optional autumn walk, story, or craft.'],['reflect','Note what you want to finish, release, or carry into winter.']]}
};
export const levelRewardCatalog=[
 {level:1,xp:0,name:'Welcome Home',desc:'Choose a cozy drink and 10 minutes of relaxing time.'},
 {level:2,xp:100,name:'Rhythm Keeper',desc:'Enjoy a guilt-free 20-minute craft, reading, or gaming break.'},
 {level:3,xp:250,name:'Momentum Maker',desc:'Plan a favorite snack or a special at-home movie night.'},
 {level:4,xp:500,name:'Reliable Quester',desc:'Claim an uninterrupted 45-minute hobby session when practical.'},
 {level:5,xp:750,name:'Home Base Champion',desc:'Choose a small, budget-friendly personal treat or free outing.'},
 {level:6,xp:1000,name:'Systems Master',desc:'Plan a dedicated creative afternoon or cozy solo recharge.'},
 {level:7,xp:1500,name:'Legendary Adventurer',desc:'Choose a special experience or a planned treat within budget.'},
 {level:8,xp:2000,name:'Household Legend',desc:'Celebrate with a meaningful, preplanned personal reward or experience.'}
];
