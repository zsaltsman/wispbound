import { isSet, has } from './state';
import { P_LOW, P_MID, P_HIGH, type Script, type Gate, type W } from './helpers';
import { PIP, P_PIP, pip, scene, cam, camPx, pop, bars, cut } from './w2_fx';
import { partMilestone } from './w2_main';
import { votes, cash, VOTERS, STUBBORN } from './w2_state';
import { C } from '../ui/ui';
import { ISL_DOORS } from '../world/maps/island';
import { HERO_BIKE } from '../world/maps/w2interiors';

// Saltwash's civic machinery: the mayor's re-election, the bank, the
// technician, and a motorcycle dealership with one very loose part.

const MAYOR = 'MAYOR BIGGS';
const BANK = 'MS. LEDGER';
const TECH = 'TINA';
const RICK = 'SLICK RICK';
const P_RICK = 1200;

const setCash = (w: W, n: number) => w.set('w2_cash', n);

async function chaChing(w: W, text: string) {
  w.sfx('register');
  await w.say(text);
}

// ================================================================== City Hall

const HALL: Record<string, Script> = {
  async mayor2(w) {
    const st = w.state;
    const M = (s: string, p = P_MID) => w.say(s, MAYOR, { pitch: p });
    if (isSet(st, 'w2_evac_done')) return M("I'm staying. Captain, ship, all that. Somebody has to turn the lights off.");
    if (!isSet(st, 'w2_inv_met')) {
      await M("Welcome to City Hall! Brando Biggs, your mayor. For one more day, possibly.");
      await M("The election's tomorrow. Everyone thinks I caused the tsunamis. I can't even cause a decent barbecue.");
      return;
    }
    if (!isSet(st, 'w2_hall_met')) {
      await M('Ah! A citizen! A young citizen! A young citizen with... a very odd gentleman. Hello, Pipwick.');
      await pip(w, 'Brando.');
      await M("Election's tomorrow, you know. Nobody wants to vote for me. They think I'm responsible for the floods. They don't trust me.");
      await M("I've tried everything. Speeches. Posters. A free sandbag with every vote. Nobody wants a sandbag anymore.");
      await M('What can I do for you? Something small, I hope. Small and cheap and popular.');
      await w.say('You show the mayor the checklist.');
      await w.wait(300);
      await w.emote('mayor2', '!', 900);
      w.sfx('warn');
      await M('WHAT?!', P_HIGH);
      await M('A PHASE-CONJUGATE DISAMBIGUATED DEFLECTOR?! Why on EARTH would you need one of those?', P_HIGH);
      await M('Those things are incredibly expensive! Ten thousand dollars, at least! The island budget is eleven dollars and a coupon!', P_HIGH);
      await M("The only place on the island that sells them is Tech Repair, next to the bank. You're going to have to ask the bank for that kind of money.", P_MID);
      w.set('w2_hall_met');
      return;
    }
    if (!isSet(st, 'w2_bank_asked')) return M('Ten thousand dollars! Try the bank. Ms. Ledger. Be polite. She smells fear. And also bad credit.');
    if (!isSet(st, 'w2_deal')) {
      await M('Back already? How did the bank go?');
      await w.say("You explain: the loan is fine. But first there's an old $500 debt to clear. You don't need ten thousand from him. Just five hundred.");
      await M('Five hundred dollars? Hm. Hmmm. That is a lot of coupons.', P_LOW);
      await w.wait(600);
      await M('DEAL.', P_HIGH);
      await M('However! I need something from you. A small, simple, completely legal favor.');
      await M('I need five people to change their minds and agree to vote for me tomorrow.');
      await M('Get me five votes, and I will give you your five hundred dollars. Out of my own pocket. My own, very empty pocket.');
      await M("Here's who's still undecided. Eight residents. Gus and Marla on the west end of Center Avenue. Dot, Quentin and Otto on North Road. Bev and Sid on Low Street. And Lorna, by the grocery.");
      await M("They're all angry about something. Some of them are angry about EVERYTHING. If they bring things up, here's the truth, for what it's worth:");
      await M('The flood money went into the sea wall. We rebuilt it twice. The waves knocked it down twice. Every receipt is public.');
      await M("After the second wave, I went door to door. Marla's was the first door. I carried her boxes myself. I still have the back pain.");
      await M('I publish every flood report the day I get it. Every measurement. Nobody reads them. Nobody reads anything.');
      await M("And I offered to resign. Twice. The council said no. Nobody else would take the job.");
      await M('...Go on. Five votes. Please. I really, really like being the mayor.', P_LOW);
      w.set('w2_deal');
      return;
    }
    if (!isSet(st, 'w2_paid500')) {
      const v = votes(st);
      if (v < 5) {
        await M(`How many votes have we got? ${v}? Out of five? Keep going! I believe in you! I need you to believe in me!`);
        const refused = VOTERS.filter((id) => st.flags['w2_' + id] === -1).length;
        if (refused) await M("Some people just won't budge. Don't take it personally. I do, but you shouldn't.", P_LOW);
        return;
      }
      w.sfx('cheer');
      await M('FIVE VOTES?! FIVE?! I could kiss you! I won\'t! That would be bad for the campaign!', P_HIGH);
      await M("A deal's a deal. Five hundred dollars. It was going to be my emergency fund. But this is an emergency.", P_MID);
      setCash(w, cash(st) + 500);
      w.set('w2_paid500');
      await chaChing(w, 'GOT $500!');
      await pip(w, 'You did politics. I\'m so proud. And slightly scared of you.');
      return;
    }
    await M("Thank you again. If I win tomorrow, my first act will be naming a sandbag after you.");
  },
  async hall_portrait(w) {
    await w.say('Portraits of past mayors. Every one is posing in front of the sea. In the more recent ones, the sea is noticeably closer.');
  },
  async hall_floodline(w) {
    await w.say("A dark tide mark runs across the wall at head height. Someone has written next to it, in pencil: 'THIS HIGH. MARCH 3RD.'");
  },
  async hall_ballot(w) {
    await w.say("The ballot box for tomorrow's election. It has been sandbagged shut. Democracy will be very dry.");
  },
  async hall_files(w) {
    await w.say('Cabinets full of flood reports. Every page is stamped PUBLIC. Not one of them looks like it has ever been opened.');
  },
  async hall_books(w) {
    await w.say('A shelf of books: "Leadership In Crisis", "Leadership In A Bigger Crisis", "How To Swim".');
  },
  async hall_bucket(w) {
    w.sfx('drip');
    await w.say("A bucket catches a drip from the ceiling. It is almost full. Someone has labelled it 'SEA LEVEL MONITOR'.");
  },
  async hall_plan(w) {
    await w.say('A blueprint of SALTWASH TOWERS, a grand development that will never be built. Someone has drawn a little wave crashing over it.');
  },
};

// ================================================================== the bank

const BANKS: Record<string, Script> = {
  async banker(w) {
    const st = w.state;
    const B = (s: string) => w.say(s, BANK, { pitch: P_HIGH });
    if (isSet(st, 'w2_loan')) return B('Spend it wisely. Or spend it on a submarine. I suppose those can be the same thing.');
    if (isSet(st, 'w2_debt_paid')) {
      await B("Debt-free! Wonderful. Now, about that loan.");
      await B("Ten thousand dollars, approved. Please sign here. And here. And here. And initial here, here, and on the back of my hand. Joking. Mostly.");
      w.sfx('register');
      setCash(w, cash(st) + 10000);
      w.set('w2_loan');
      await chaChing(w, 'GOT A $10,000 LOAN!');
      await w.say('A thick stack of cash. You have never held this much money. You may never again.');
      await pip(w, "Don't spend it all on candy. Spend most of it on the deflector, and THEN candy.");
      return;
    }
    if (isSet(st, 'w2_paid500')) {
      await B('You have... five hundred dollars? For the outstanding balance? How unexpected.');
      w.sfx('register');
      setCash(w, cash(st) - 500);
      w.set('w2_debt_paid');
      await chaChing(w, 'PAID $500. YOUR DEBT IS CLEARED!');
      await B('Your credit report is now spotless. Practically sparkling.');
      return SCRIPTS_BANK_LOAN(w);
    }
    if (isSet(st, 'w2_bank_asked')) return B('The loan is ready the moment that five hundred dollars is cleared. Not a moment before. Banking!');
    if (!isSet(st, 'w2_hall_met')) {
      await B('Welcome to the Bank of Saltwash. We are open. Somehow. How may I help you?');
      await B("If you need a loan, I'll need to know what it's for. We don't lend money for 'vibes' anymore. Not since the last wave.");
      return;
    }
    await B('Welcome to the Bank of Saltwash. How may I help you?');
    await w.say("You ask for a loan. Ten thousand dollars. For a Phase-Conjugate Disambiguated Deflector.");
    await B('A what? ...Never mind. I have stopped asking.');
    await B("We'd be happy to approve that loan.");
    await w.wait(300);
    w.sfx('deny');
    await B('However, your credit report shows an outstanding balance of $500.');
    await w.emote('player', '?', 800);
    await B("Yes, you. Apparently you owe a Madame Oracle of Hollowhaven five hundred dollars for 'one vision, unpaid'. She reports everything.");
    await pip(w, 'You owe a PSYCHIC money? Across the SEA? I have so many questions.');
    await B("We can't approve another loan until that's paid off. Five hundred dollars. Then we'll talk.");
    w.set('w2_bank_asked');
  },
  async bank_vault(w) {
    await w.say('The vault door. Somebody has stuck a sign on it: "MOVED VALUABLES TO HIGHER SHELF".');
  },
  async bank_portrait(w) {
    await w.say('The bank founder, painted holding a bag of coins and looking very pleased with himself.');
  },
};

async function SCRIPTS_BANK_LOAN(w: W) {
  await w.say('Now. The loan. Ten thousand dollars?', BANK, { pitch: P_HIGH });
  if (await w.confirm('Take the $10,000 loan?')) {
    w.sfx('register');
    setCash(w, cash(w.state) + 10000);
    w.set('w2_loan');
    await chaChing(w, 'GOT A $10,000 LOAN!');
    await w.say('A thick stack of cash. You have never held this much money. You may never again.');
    await pip(w, "Don't spend it all on candy. Spend most of it on the deflector, and THEN candy.");
  } else await w.say('Whenever you are ready. The money is not going anywhere. Well. Unless the bank does.', BANK, { pitch: P_HIGH });
}

// ================================================================== Tech Repair

const TECHS: Record<string, Script> = {
  async techie(w) {
    const st = w.state;
    const T = (s: string) => w.say(s, TECH, { pitch: P_MID });
    if (has(st, 'deflector') || isSet(st, 'w2_assembled')) return T("Take care of that deflector. Clean the conjugator once a week. With a toothbrush. Not YOUR toothbrush.");
    if (!isSet(st, 'w2_inv_met')) {
      await T("Tech Repair. Radios, toasters, generators, hearts. Not hearts. I'm not that kind of doctor. I'm not a doctor.");
      return;
    }
    if (!isSet(st, 'w2_tech_seen')) {
      w.set('w2_tech_seen');
      await T('Pipwick! Haven\'t seen you since the toaster incident. Is that still burning?');
      await pip(w, "It's not burning. It's DEMONSTRATING.");
    }
    await T("A Phase-Conjugate Disambiguated Deflector? Yeah, I've got one. The only one on the island. It's in the back, wrapped in three blankets.");
    await T('Ten thousand dollars. Firm.');
    if (cash(st) < 10000) {
      await T(`You've got... $${cash(st)}. Uh huh. Come back when you've got the other $${(10000 - cash(st)).toLocaleString('en-US')}.`);
      return;
    }
    await w.say('You put a stack of ten thousand dollars on the counter.');
    await w.wait(500);
    await w.emote('techie', '!', 900);
    await T('Wait...');
    await T('YOU have ten thousand dollars?');
    await w.wait(500);
    await T("Well, I'll be. A kid with a ghost and ten grand. What a world. What a week.");
    if (!(await w.confirm('Buy the Phase-Conjugate Disambiguated Deflector for $10,000?'))) return T('No rush. It has been back there for six years. It can wait.');
    setCash(w, cash(st) - 10000);
    w.sfx('register');
    await T("Pleasure doing business. Don't drop it. Seriously, don't drop it. It does a thing when you drop it.");
    await w.give('deflector', 1, 'GOT THE PHASE-CONJUGATE DISAMBIGUATED DEFLECTOR!');
    await pip(w, 'Ten thousand dollars! Worth every penny. Probably.');
    await partMilestone(w);
  },
  async tech_screen(w) {
    await w.say('A row of monitors shows the weather radar. All of them show the same thing: a huge, still blob just off the coast. It does not look like weather.');
  },
  async tech_machine(w) {
    await w.say('A machine with a dozen dials. A sign says DO NOT TOUCH. A second, smaller sign says I MEAN IT.');
  },
  async tech_computer(w) {
    await w.say('A computer running a program called WAVE_PREDICTOR_V9.EXE. The only output is "SOON".');
  },
  async tech_tools(w) {
    await w.say('Tools on pegs, each one outlined in marker. The outline for the big wrench is empty. Labelled "PIPWICK HAS IT".');
  },
};

// ================================================================== the eight voters

interface Round {
  q: string; // what they say (before the choice)
  opts: string[];
  good: number; // index of the persuasive answer (-1: nothing works)
  replies: string[]; // their reply to each option
}
interface Voter {
  name: string;
  pitch: number;
  hello: string[]; // before the mayor's deal
  rounds: Round[];
  win: string[];
  lose?: string[]; // stubborn ones: how they finally refuse
  again: string; // after they've agreed / refused
}

const V: Record<string, Voter> = {
  v_gus: {
    name: 'GUS',
    pitch: P_LOW,
    hello: ["Where did all the flood money go, eh? MILLIONS! I keep every receipt. Not THEIRS. Mine. I've been keeping track of my own outrage."],
    rounds: [
      {
        q: 'You want me to vote for Biggs? Then tell me: where did the flood money go? Millions! GONE!',
        opts: ['Into the sea wall. Twice.', 'Somewhere nice, probably.', 'Money is a social construct.'],
        good: 0,
        replies: [
          "...The sea wall. That got knocked down. Then rebuilt. Then knocked down. Hm. The receipts ARE public. I hate that they're public.",
          'SOMEWHERE NICE?! I KNEW IT! A YACHT! He bought a YACHT with my sandbags! Get out!',
          "Construct THIS. *points at the door*",
        ],
      },
      {
        q: "Fine. FINE. Then why are we still flooding, if they spent it all on walls?",
        opts: ['Try a bigger sandbag?', 'Nobody knew the cause. I do.', 'The mayor spent it on hats.'],
        good: 1,
        replies: [
          'A BIGGER SANDBAG. Wow. Never thought of that. Out.',
          "You know what's causing it? You, a kid, with a ghost and that lunatic? ...Do you know what, nobody else has even tried. Go on.",
          'HATS! I KNEW IT! He wears SO many hats! Out!',
        ],
      },
    ],
    win: ["...Alright. If you really are going to stop the waves, I'll give Biggs one more term. ONE.", 'And I want receipts.'],
    again: "I'm voting for Biggs. Under protest. Very loud protest.",
  },
  v_marla: {
    name: 'MARLA',
    pitch: P_HIGH,
    hello: ['My house is at the bottom of the bay. I live in boxes now. At my sister\'s. She snores. The boxes don\'t.'],
    rounds: [
      {
        q: "I lost EVERYTHING. My house is in the sea. What has the mayor ever done for ME?",
        opts: ['At least you have boxes!', 'He carried your boxes himself.', 'Try a houseboat?'],
        good: 1,
        replies: [
          'At least I... have boxes. Thank you. I feel so much better. Get out.',
          "...He did. He did, didn't he. First door on the street. He dropped my good lamp. But he carried them. I'd forgotten.",
          'A HOUSEBOAT. That is what my house IS now! It is a BOAT! It is on the BOTTOM!',
        ],
      },
      {
        q: 'And next time? When it happens again? What then?',
        opts: ["There won't be a next time.", 'Learn to swim?', "He'll carry two boxes."],
        good: 0,
        replies: [
          "You really believe that, don't you. Oh, you poor sweet thing. ...Somebody should. Fine. Somebody should believe it.",
          'I CAN swim. That is how I SURVIVED. Get out.',
          'Two boxes. Wow. Truly a visionary. Out.',
        ],
      },
    ],
    win: ["Tell Brando he has my vote. And that he still owes me a lamp."],
    again: 'I\'m voting for Brando. He still owes me a lamp.',
  },
  v_dot: {
    name: 'DOT',
    pitch: P_MID,
    hello: ['I run the island\'s laundromat. Had it for thirty years. Nobody in charge has asked me one single thing. Not once.'],
    rounds: [
      {
        q: 'Nobody in charge ever asks people like me ANYTHING. Why should I vote for any of them?',
        opts: ["I'm not in charge either.", "Then I'm asking. What do you need?", 'The mayor is very busy.'],
        good: 1,
        replies: [
          "Exactly. So what are you doing in my house? Out.",
          "...Oh. Oh! Well. Nobody's ever... alright. Since you asked.",
          'BUSY. Busy! I wash four hundred pairs of soggy socks a DAY, young lady, young man, young whatever you are!',
        ],
      },
      {
        q: 'Clean water. Dryers that work. And someone to say THANK YOU to the folks bailing out their homes every morning.',
        opts: ["That's a lot of words.", "I'll make sure he hears it.", 'Dryers? In THIS economy?'],
        good: 1,
        replies: [
          'It is a lot of words. You will notice I said them anyway. Out.',
          "You will? ...You know, I think you actually will. Strangest thing. Alright.",
          'Get out of my house before I put you in a dryer.',
        ],
      },
    ],
    win: ["Tell Brando: Dot's voting for him. And tell him to come by. With socks."],
    again: "I'm voting for Brando. Tell him to bring socks.",
  },
  v_quentin: {
    name: 'QUENTIN',
    pitch: P_MID,
    hello: ['Every newspaper since the first wave. Every measurement. Pinned to my wall. The mayor is HIDING something. I just need to find out what.'],
    rounds: [
      {
        q: "The mayor's hiding something. Reports. Measurements. The REAL numbers. I KNOW it.",
        opts: ['Everyone hides something.', 'He published every report.', "He's hiding a second mayor."],
        good: 1,
        replies: [
          'EXACTLY! You admit it! Get out, you\'re probably hiding something too!',
          "...He did? Where? ...Wait. Those ones. On my wall. I pinned them there myself. I thought they were LEAKED.",
          "A SECOND, SMALLER MAYOR?! ...No. No, that's ridiculous. Get out before I start believing it.",
        ],
      },
      {
        q: "Then why can't anyone EXPLAIN it? No quake. No storm. The sea just... rises!",
        opts: ['Ask the fish.', 'Something huge is under the sea.', "It's probably the moon."],
        good: 1,
        replies: [
          "Ask the fish. The fish are GONE, kid. Every fish left. ...Huh. Every fish left. No, no, get out, I need to think.",
          "Something huge... displacing the water... That would explain the readings. ALL of the readings. Oh my god.",
          "I checked the moon. It's fine. The moon is innocent. Out.",
        ],
      },
    ],
    win: ["Something huge under the sea. It all fits. Alright. Biggs gets my vote. But I'm watching. I'm always watching."],
    again: "Biggs has my vote. I'm still watching. I have binoculars now.",
  },
  v_bev: {
    name: 'BEV',
    pitch: P_HIGH,
    hello: ["I taught at the island school for forty years. Do you know what I taught them? Responsibility. Something our mayor has never heard of."],
    rounds: [
      {
        q: 'A captain goes down with his ship. He should have RESIGNED after the second wave.',
        opts: ['Resigning is for quitters!', 'Then who holds the umbrella?', 'He tried. The council said no.'],
        good: 2,
        replies: [
          "Resigning is for people with SHAME, dear. Detention. Out.",
          "Is that a joke? Was that a joke? Out. Detention.",
          "...He offered? Twice? Because nobody else would take the job? Well. That's... that is not what the newspaper said.",
        ],
      },
      {
        q: "Hm. Nobody else would take it. Then why should he keep it?",
        opts: ['He looks good in a hat.', 'He stayed when he could have run.', "He's got nowhere else to go."],
        good: 1,
        replies: [
          'He does NOT look good in a hat. Nobody looks good in that hat. Out.',
          "He stayed. They all could have left. He stayed. ...That's a lesson, isn't it. I'd have given that one a gold star.",
          "Neither do the rest of us, dear. That is the whole problem. Out.",
        ],
      },
    ],
    win: ['Very well. Mr. Biggs gets my vote. And a gold star. Just the one.'],
    again: 'Mr. Biggs gets my vote. Tell him to sit up straight.',
  },
  // ---------------------------------------------------------------- the three who will never budge
  v_otto: {
    name: 'OTTO',
    pitch: P_LOW,
    hello: ['Politicians. All of them. ALL of them. In principle.'],
    rounds: [
      {
        q: "Biggs? Biggs is a politician. I don't vote for politicians. Can't trust 'em. Not one.",
        opts: ['He stayed for the island.', 'He tells the truth.', 'Who DO you vote for?'],
        good: -1,
        replies: [
          "That's what a politician WOULD do. Stay. Sneaky.",
          "Truth is what a politician calls a lie he's practiced.",
          "Last three elections, I wrote in a potato. A real one. From my garden.",
        ],
      },
      {
        q: 'The potato has never lied to me. The potato has never raised my taxes. The potato has a SPOTLESS record.',
        opts: ['The potato rotted.', 'The potato can\'t stop floods.', 'Vote for the mayor.'],
        good: -1,
        replies: ["Then I'll grow another. Democracy is a garden.", 'Neither can Biggs.', "No."],
      },
    ],
    win: [],
    lose: ["No. Never. Not Biggs, not anybody. The potato gets my vote. The potato ALWAYS gets my vote."],
    again: 'The potato has my vote. As always. Get off my lawn. I don\'t have a lawn anymore. Get off where it was.',
  },
  v_sid: {
    name: 'SID',
    pitch: P_MID,
    hello: ['Duuude. Elections are, like, totally pointless. Want to know why? It takes about four hours to explain.'],
    rounds: [
      {
        q: "Voting is a construct, dude. Elections are a construct. This conversation is a construct. Want me to explain why?",
        opts: ['Sure.', 'Please no.', 'Vote for the mayor.'],
        good: -1,
        replies: [
          "Okay so, like, first there was the ocean. Right? And then... no wait, before that... *forty minutes pass*",
          "Rude. Constructively rude, though. I respect it.",
          "The mayor is a construct, man.",
        ],
      },
      {
        q: "...and THAT'S why the tide is basically just the moon's opinion. So, like. What were you saying?",
        opts: ['Your vote matters!', 'The island needs you.', 'I forgot.'],
        good: -1,
        replies: ["Does it though?", "The island needs SURFBOARDS.", 'Same, dude. Same.'],
      },
    ],
    win: [],
    lose: ["I'll consider it. ...Okay, I considered it. No. Elections are pointless. Peace."],
    again: "Still not voting, dude. But I'm, like, voting in spirit. For nobody.",
  },
  v_lorna: {
    name: 'LORNA',
    pitch: P_HIGH,
    hello: ['Brando Biggs. Don\'t say that name in my house. You said it. You said it in my head. Out.'],
    rounds: [
      {
        q: "You want to know why I won't vote for Brando Biggs? 1979. The Saltwash Junior Spelling Bee.",
        opts: ['...What happened?', 'That was decades ago!', 'Vote for the mayor.'],
        good: -1,
        replies: [
          "Final round. His word was T-S-U-N-A-M-I. He spelled it with no T. NO T! And the judges ALLOWED it!",
          'DECADES of INJUSTICE, yes!',
          "I would rather vote for the sea.",
        ],
      },
      {
        q: "'Sunami'! SUNAMI! And now look. LOOK out the window. The irony is SUFFOCATING.",
        opts: ['He was eight.', 'Let it go?', 'The spelling has improved.'],
        good: -1,
        replies: ["I was SEVEN, and I spelled it CORRECTLY.", "I have let NOTHING go. I still have the dictionary.", "Not enough."],
      },
    ],
    win: [],
    lose: ['No. No, no, no. Not in this lifetime. Not in the next one. There\'s a T in tsunami. There is ALWAYS a T.'],
    again: 'There is a T in tsunami. Tell him. Tell him Lorna remembers.',
  },
};

async function debate(w: W, id: string) {
  const v = V[id];
  const st = w.state;
  const S = (s: string) => w.say(s, v.name, { pitch: v.pitch });
  const state = st.flags['w2_' + id];
  if (state === 1 || state === -1) return S(v.again);
  if (!isSet(st, 'w2_deal')) {
    for (const l of v.hello) await S(l);
    return;
  }
  if (isSet(st, 'w2_paid500')) return S("Election's tomorrow. If there's an island left to vote on.");
  await w.say(`You ask ${v.name} about voting for Mayor Biggs.`);
  for (let r = 0; r < v.rounds.length; r++) {
    const round = v.rounds[r];
    const pick = await w.ask(round.q, round.opts, v.name, { pitch: v.pitch });
    await S(round.replies[pick]);
    if (round.good >= 0 && pick !== round.good) {
      w.sfx('wrong');
      await w.say(`${v.name} isn't convinced. You can always come back and try a different argument.`);
      if (!isSet(st, 'w2_debate_tip')) {
        w.set('w2_debate_tip');
        await pip(w, 'Listen to what is actually bothering them. And remember what the mayor told you.');
      }
      return;
    }
    if (round.good >= 0) w.sfx('right');
  }
  if (STUBBORN.has(id)) {
    for (const l of v.lose ?? []) await S(l);
    w.set('w2_' + id, -1);
    w.sfx('deny');
    await w.say(`${v.name} will never vote for the mayor. No point asking again.`);
    return;
  }
  for (const l of v.win) await S(l);
  w.set('w2_' + id, 1);
  w.set('w2_votes_ok', votes(w.state));
  w.sfx('quest');
  const n = votes(w.state);
  await w.say(`${v.name} WILL VOTE FOR THE MAYOR! (${n}/5 VOTES)`);
  if (n >= 5) await pip(w, 'Five! FIVE VOTES! Back to City Hall! Quickly, before anyone changes their mind!');
}

const VOTER_SCRIPTS: Record<string, Script> = {};
for (const id of Object.keys(V)) VOTER_SCRIPTS[id] = (w) => debate(w, id);

const HOMES: Record<string, Script> = {
  async gus_files(w) {
    await w.say('A filing cabinet labelled THINGS THAT MAKE ME ANGRY. Every drawer is full.');
  },
  async quentin_wall(w) {
    await w.say('Newspaper clippings, flood reports and maps, joined with string. In the middle, a photo of the sea with a big question mark drawn on it.');
  },
  async otto_posters(w) {
    await w.say('Election posters, every one with a moustache drawn on. Even the moustache is crossed out.');
  },
  async lorna_pots(w) {
    await w.say('Flowerpots. One of them holds a dictionary, open to the letter T, in a frame.');
  },
  async flood_sofa(w) {
    await w.say('A sofa, soaked through. Seaweed is drying on the cushions. A remote control floats in the shallow water nearby.');
  },
  async flood_bed(w) {
    await w.say('The bed is still made. The water has come up to the pillow and gone down again, leaving a dark line across the sheets.');
  },
  async flood_photo(w) {
    await w.say('A family photo on the shelf above the water line. Somebody put it up high on purpose. They came back for nothing else.');
  },
};

// ================================================================== Rick's Rides

const DEALER: Record<string, Script> = {
  async enter_w2_dealer(w) {
    if (isSet(w.state, 'w2_dealer_greet')) return;
    w.set('w2_dealer_greet');
    await w.wait(200);
    w.face('rick', 'up');
    await w.move('rick', ['up', 'up'], 160);
    await w.say('HEY THERE!', RICK, { pitch: P_RICK });
    await w.say('Looking for a new ride? Come on in! Come in, come in, come in!', RICK, { pitch: P_RICK });
    await w.say('Anything catch your eye? Anything at all? Everything here is for sale! Including me! Kidding! ...Unless?', RICK, { pitch: P_RICK });
  },
  async rick(w) {
    const st = w.state;
    const R = (s: string) => w.say(s, RICK, { pitch: P_RICK });
    if (isSet(st, 'w2_dealer_away')) return;
    if (!isSet(st, 'w2_inv_met') || has(st, 'turbo')) {
      await R("Slick Rick! Rick's Rides! Every bike guaranteed for one full week or one full wave, whichever comes first!");
      return;
    }
    w.set('w2_dealer_met');
    await R('So! What brings you to Rick\'s Rides today? Looking for something fast? Something loud? Something with flames painted on it?');
    const a = await w.ask('Go on, tell Rick what you want!', ['JUST LOOKING', 'THE BIG SHINY ONE', 'NOTHING'], RICK, { pitch: P_RICK });
    if (a === 2) {
      await R("Nothing?! NOBODY wants NOTHING! Everyone wants something! Take a look around. I'll be right here. Smiling.");
      return;
    }
    if (a === 0) await R("Just looking! Classic. Love it. Looking is the first step to OWNING.");
    else await R("THE WIDOWMAKER 3000! You have TASTE! You have STYLE! Do you have a LICENSE? Doesn't matter!");
    await w.emote('rick', 'note', 700);
    await R("Now, let's talk budget. What are we working with here? Ballpark.");
    const b = await w.ask('What is your budget?', ['$0', 'A JAR OF PEANUT BUTTER', 'WHATEVER IT TAKES'], RICK, { pitch: P_RICK });
    if (b === 0) await R("Zero dollars! Ha! HA! Great sense of humor. Love that. We have financing. We have SO much financing.");
    else if (b === 1) await R("Peanut butter. Okay. Okay. I've taken stranger. I once took a goat. We can work with peanut butter.");
    else await R('WHATEVER IT TAKES! Those are the three most beautiful words in the English language!');
    await R("Tell you what. You seem like good people. Let me talk to my boss. See what kind of deal we can get you.");
    await R('Stay right there! Don\'t move! Don\'t touch anything! Unless you want to buy it!');
    // he heads for the back office
    // around the bikes: along the clear row, then up the side to the office door
    const r = w.actor('rick')!;
    const path: ('up' | 'down' | 'left' | 'right')[] = [];
    let x = r.x;
    let y = r.y;
    for (; y < 7; y++) path.push('down');
    for (; y > 7; y--) path.push('up');
    for (; x < 14; x++) path.push('right');
    for (; x > 14; x--) path.push('left');
    for (; y > 2; y--) path.push('up');
    await w.move('rick', path, 170);
    w.face('rick', 'up');
    w.sfx('door');
    w.hide('rick');
    w.set('w2_dealer_away');
    await w.wait(600);
    await w.say('From behind the office door: "BOSS? It\'s Rick. ...Yes, I know I\'m the boss. I\'m talking to myself. Good deal? GREAT deal."');
    await w.wait(500);
    w.music(null);
    await w.say('You get the urge to steal something.');
    await pip(w, "Psst! The big shiny one, in the middle! The Turbo-Encabulator's under the seat. Lefty-loosey! Quickly!");
    w.music('dealer');
  },
  async dealer_hero(w) {
    const st = w.state;
    if (has(st, 'turbo') || isSet(st, 'w2_assembled')) return w.say('THE WIDOWMAKER 3000. It sits a little lower now. Something important is missing.');
    await w.say('THE WIDOWMAKER 3000. Chrome everything. Flames painted down the tank. A price tag that just says "YES".');
    if (!isSet(st, 'w2_dealer_away')) {
      if (isSet(st, 'w2_inv_met')) await w.say('Under the seat, something hums. Rick is watching you very closely. And smiling. Constantly. Smiling.');
      return;
    }
    await w.say('Under the seat, something hums with a strange, smug energy: a TURBO-ENCABULATOR.');
    if (!(await w.confirm('Steal the Turbo-Encabulator?'))) return w.say('You leave it. For now. The urge does not leave you.');
    // the heist
    w.music(null);
    const s = scene(w);
    await w.emote('player', '...', 500);
    w.face('player', 'left');
    await w.wait(250);
    w.face('player', 'right');
    await w.wait(250);
    w.face('player', 'up');
    for (let i = 0; i < 4; i++) {
      w.sfx(i === 3 ? 'clank' : 'tick');
      pop(w, w.player.sprite.x + (i % 2 ? 6 : -6), w.player.sprite.y - 22, i === 3 ? 'CLUNK' : 'creak', C.light, 500);
      await w.wait(380);
    }
    await pip(w, "Lefty-loosey... lefty-loosey... RIGHTY-TIGHTY IS THE WRONG WAY... there!");
    w.sfx('item');
    await w.give('turbo', 1, 'GOT THE TURBO-ENCABULATOR!');
    w.set('w2_stole');
    // Rick comes back
    w.sfx('door');
    w.set('w2_dealer_away', false);
    w.hide('rick', false);
    w.face('rick', 'left');
    await w.say("Okay! Good news! The boss says we can do zero down, zero interest, zero—", RICK, { pitch: P_RICK });
    w.faceTo('rick', 'player');
    await w.emote('rick', '!', 900);
    w.music('rick');
    await w.say('HEY!', RICK, { pitch: 1400 });
    await w.say('WHAT ARE YOU DOING?!', RICK, { pitch: 1400 });
    await w.say("THAT'S MY TURBO-ENCABULATOR! THAT'S A FACTORY ORIGINAL! GET BACK HERE!", RICK, { pitch: 1400 });
    await pip(w, 'RUN! RUN RUN RUN! TO THE DOOR!');
    await SCRIPTS_CHASE(w);
    void s;
  },
  async dealer_bike(w) {
    const lines = [
      "THE SEA DEVIL. Price: 'ASK RICK'. A smaller tag underneath says 'DON'T ASK RICK'.",
      'A sensible scooter, painted to look like a dragon. The dragon looks embarrassed.',
      'THE TIDE BREAKER. Its seat still has a puddle in it.',
      'A motorcycle with three wheels and a sidecar. The sidecar also has a sidecar.',
    ];
    await w.say(lines[Math.floor(Math.random() * lines.length)]);
  },
  async dealer_office(w) {
    if (isSet(w.state, 'w2_dealer_away')) await w.say('Through the door: "...I said GREAT deal, Rick. No, YOU listen, Rick."');
    else await w.say("A door marked RICK'S OFFICE. Underneath: RICK'S BOSS'S OFFICE. Underneath that, smaller: ALSO RICK.");
  },
  async dealer_service(w) {
    await w.say('The service bay: tires, oil drums, and a calendar where every month is a photo of Rick.');
  },
  async dealer_computer(w) {
    await w.say('A spreadsheet titled MY COMMISSION. Every number in it is zero. One of them is negative.');
  },
  async dealer_poster(w) {
    await w.say('A poster: "RICK\'S RIDES: WE\'LL TAKE ANYTHING IN TRADE". A handwritten addition: "EXCEPT BOATS. WE HAVE ENOUGH BOATS."');
  },
};

/** Out the door, with Rick right behind you. */
async function SCRIPTS_CHASE(w: W) {
  const goal = { x: 8, y: 11, w: 2, h: 1 };
  const remove = bars(w);
  let caught = 0;
  // the showroom chase is live: run for the exit (hold Shift/X to sprint)
  await w.say('(Run for the exit! Hold SHIFT or X to sprint!)');
  for (;;) {
    const r = await w.chase('rick', caught ? 190 : 210, goal, 40000);
    if (r === 'escaped') break;
    caught++;
    w.sfx('hit');
    w.shake(300, 0.008);
    await w.say(caught === 1 ? 'GOTCHA!— hey, what is THAT behind you?!' : "GOT YOU AGAIN!— is that a CUSTOMER?!", RICK, { pitch: 1400 });
    w.faceTo('rick', 'player');
    await w.say('He turns to look. You wriggle free!');
    // shove Rick back toward the office
    const a = w.actor('rick')!;
    a.x = 14;
    a.y = 2;
    a.place();
  }
  await remove();
  // outside: one last scramble, and he loses you
  await w.fade(true, 200);
  cut(w, 'isl', ISL_DOORS.dealer.x, ISL_DOORS.dealer.y + 1, 'down');
  await w.fade(false, 200);
  await w.move('player', ['down', 'down', 'right', 'right', 'right', 'right', 'right', 'down', 'down', 'down'], 120);
  w.face('player', 'up');
  w.spawn('rick_out', 'rick', ISL_DOORS.dealer.x, ISL_DOORS.dealer.y + 1, 'down');
  w.sfx('door');
  await camPx(w, ISL_DOORS.dealer.x * 16 + 8, (ISL_DOORS.dealer.y + 2) * 16, 300);
  await w.move('rick_out', ['down'], 140);
  w.face('rick_out', 'left');
  await w.wait(400);
  w.face('rick_out', 'right');
  await w.wait(400);
  w.face('rick_out', 'down');
  await w.say("WHERE'D YOU GO?! I KNOW YOU'RE OUT THERE!", RICK, { pitch: 1400 });
  await w.say('I NEVER FORGET A CUSTOMER! NEVER! YOU HAVEN\'T SEEN THE LAST OF SLICK RICK!', RICK, { pitch: 1400 });
  await w.move('rick_out', ['up'], 140);
  w.sfx('slam');
  w.remove('rick_out');
  await w.camReturn(400);
  w.music('island');
  await pip(w, "...We are criminals now. I've always wanted to be a criminal. It's awful.");
  w.set('w2_chase_done');
  await partMilestone(w);
}

export const W2_CIVIC_GATES: Record<string, Gate> = {
  async w2_dealer_door(w) {
    if (isSet(w.state, 'w2_stole')) {
      await w.say("The doors are locked. A sign hangs in the window: CLOSED. GONE HUNTING. -RICK.");
      return false;
    }
    return true;
  },
  async w2_dealer_exit(w) {
    if (isSet(w.state, 'w2_dealer_away') && !has(w.state, 'turbo')) {
      await w.say('You get the urge to steal something. The big shiny motorcycle is right there.');
      await pip(w, 'The shiny one! Under the seat!');
      return false;
    }
    if (w.chasing) return false;
    return true;
  },
};

export const W2_CIVIC: Record<string, Script> = { ...HALL, ...BANKS, ...TECHS, ...VOTER_SCRIPTS, ...HOMES, ...DEALER };

void cam;
void P_LOW;
void PIP;
void P_PIP;
void HERO_BIKE;
