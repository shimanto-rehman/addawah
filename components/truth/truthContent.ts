/** Local passage art under /public/assets/images/truth — files named by passage id (01.webp … 15.webp). */
export const TRUTH_IMAGE_BASE = '/assets/images/truth/';

/** Founder section background (not a numbered passage). */
export const TRUTH_FOUNDER_IMAGE = `${TRUTH_IMAGE_BASE}founder.webp`;

export function truthPassageImage(id: number): string {
  return `${TRUTH_IMAGE_BASE}${String(id).padStart(2, '0')}.webp`;
}

export type Passage = {
  id: number;
  /** eyebrow label shown above the title */
  kicker: string;
  title: string;
  /** short preview shown inline before "Learn more" */
  preview: string;
  /** full body as an array of paragraphs */
  body: string[];
  /**
   * Feature passages render full-bleed (team-gradient-wrap / pricing-gradient-wrap
   * style): background photo, dark overlay, white text, and the same scroll-expand
   * animation as the hero. Everything else renders as a compact grid card.
   */
  feature?: boolean;
};

/**
 * Truth passages. Passage 14 (on prayer) is intentionally NOT in this list —
 * it powers the Salah story section instead.
 */
export const PASSAGES: Passage[] = [
  {
    id: 1,
    kicker: 'Passage 01 · Design',
    title: 'The Blueprint No One Wrote',
    preview:
      'There is a concept even more thought-provoking than the observer effect: morphogenetic fields, deeply tied to quantum biology. How do birds know where to fly? How do newborns instinctively find their mother? Only the human baby arrives with a Fitrah that knows nothing — its first act is to cry.',
    body: [
      'There is a concept even more thought-provoking than the observer effect: morphogenetic fields, deeply connected to quantum biology.',
      "The birds — how do they know where to reach? How do newborn rats instinctively find the mother's nipple, and how do they know their food is stored there? Only the human baby comes with a Fitrah that doesn't know where its food is; the first thing it does is cry.",
      'Earth has a heartbeat that generates an electromagnetic field. Birds can see it and fly — they can perceive electromagnetism. Why do they see it? Because Allāhu Subḥānahu wa Taʿālā wills it. Birds have no sense of whether it benefits them; they simply follow the command.',
      'On this planet there are things that regrow when cut — an octopus loses an arm and regenerates it. Lose a part of your body and you can still feel it is there, like a tooth after extraction. Science does not fully accept the morphogenetic field but uses it as a metaphor: cut a leaf in half, view it under a certain camera, and you see an unusual outline — an aura, a vibration, a bioelectric field, all connecting to morphogenetic fields collectively.',
      'The first cell of your body formed in your mother\u2019s womb — how did it know the pattern in which to multiply? A fundamental rule of biology says all cells come from pre-existing cells, so where did the first cell come from? The blueprint inside your DNA runs automatically — but think first where it came from, and know that it is not running by itself. The design of you — where the eyes, hands, and legs will be — is stored in DNA; how do the cells know which part of it to read?',
      'Imagine standing in a desert. The sand beneath your feet contains silicon — the very material used to make computer chips. If you waited a billion years, would the sand assemble itself into a smartphone? Of course not. The raw materials are present, but information, design, and intelligence are still required. DNA is not merely a collection of chemicals; it is an information system more complex than any software ever written. If a phone cannot arise from sand by chance, why believe the information in every living cell arose without intelligence?',
      "The Quran speaks of Taqdeer — Allah's complete knowledge, decree, and control over everything in creation. You will not find everything through the eyes of science.",
    ],
  },
  {
    id: 2,
    kicker: 'Passage 02 · Time',
    title: 'Time Is Only an Illusion',
    preview:
      "In 1905 Einstein studied the electrodynamics of moving bodies: reach the speed of light and time slows. When the Prophet ﷺ went to Mi'rāj, earth's time seemed to freeze. Wheeler and DeWitt applied quantum mechanics to the universe and opened the possibility that time is not fundamental at all.",
    body: [
      "One part of the Quran appears to challenge Einstein. In 1905 he studied the electrodynamics of moving bodies: if anything reaches the speed of light, time there slows relative to elsewhere. When Prophet Muhammad ﷺ went to Mi'rāj, the time of the earth slowed or froze. Two great physicists, John Wheeler and Bryce DeWitt, applied quantum mechanics to the universe and solidified this — time is just an illusion, opening the possibility that time is not fundamental.",
      'Time only exists for those already present in three dimensions. Cross this dimension and the 3D world becomes a picture — it freezes — just as to you, a 3D being, everything in 2D seems a still image. Very few specific particles can cross it. Re-enter, and you return in the exact millisecond you left. When the Prophet ﷺ returned from Mi\u2019rāj, his bed was still warm and his door lock still moving — possible within a scientific explanation, and there is no illogical claim in Islam.',
      "Science also proposes the Holographic Principle. Gerard 't Hooft suggested the world we see, with three dimensions and one of time, is an approximation of something — that everything is only two-dimensional, a projection on a vast screen. John Lennox, the mathematician and apologist, said something similar in 1995. Juan Maldacena argued the same: gravity and three-dimensional space might be a projection — an illusion — generated by quantum information encoded on a distant, two-dimensional boundary.",
      "Don't try to answer everything with time. The time dimension is a concept for 3D creatures; you feel time through changes in reality. Is time continuous or discrete? If discrete, it moves one frame at a time, like a video — what connects one frame to the next, and how does motion emerge from disconnected moments? If continuous, can you ever reach the next moment when there are infinitely many in between?",
    ],
  },
  {
    id: 3,
    kicker: 'Passage 03 · Proof',
    title: 'God, Proven in Three Steps',
    preview:
      'I can prove God exists mathematically — no difficult formulas, just three facts a ten-year-old already knows.',
    body: [
      'I can prove God exists mathematically — no difficult formulas, just three facts a ten-year-old already knows.',
      "Fact one: when you draw a line, it has to start somewhere. You can't have a line with no beginning. The universe is the same — everything that exists has to start somewhere. Something had to be first; you can't get something from nothing.",
      'Fact two: counting down from 10 to 0 is easy. Now start from negative infinity and count to zero — you can never arrive. No starting point means you never get there. Yet we are here, today exists — which means time had a beginning, and something outside of time started it.',
      'Fact three: take any number and multiply it by one, over and over — nothing changes, nothing grows. You need something greater to enter and change things. The universe did not create itself; something more powerful had to start it.',
    ],
  },
  {
    id: 4,
    kicker: 'Passage 04 · The Unseen',
    title: 'The Observer and the Unseen',
    preview:
      'Everything is made of subatomic particles — yet they do not exist in solid form. They exist as waves of possibility that cannot become anything until an observer looks. Reality may be far larger than what we can see or measure.',
    feature: true,
    body: [
      'What is quantum physics? The science behind how the universe works at the smallest scales — the behavior of atoms, subatomic particles, and their interactions with matter and energy.',
      'Everything in this universe is made of subatomic particles, but they do not exist in solid form; they exist as waves of possibility. These waves cannot manifest into any outcome by themselves until an observer — like you and me — begins to observe. When we place attention, energy, or focus on them, they collapse into a solid particle or a desired reality. Think of your social feed: many ads exist, but the moment you click one, it becomes your experience. The quantum field holds endless possibilities; the moment you focus on change, your awareness aligns with certain possibilities, and the field guides you toward matching experiences.',
      'These particles do not respond to the effort you put in; they respond to your signals — your vibration. Your frequency is shaped by your emotions, feelings, and thoughts. Positive thoughts raise your frequency; low-frequency emotions like hatred or jealousy lower it. Based on your frequency you attract a matching frequency from the field, and it becomes your reality.',
      'Now ask yourself: if even the smallest building blocks behave in ways that defy intuition, why assume reality is limited to what we can see or measure? Islam has always taught that there is an unseen realm — al-Ghayb — beyond human perception, and that the universe runs according to Allah\u2019s Qadr (Taqdīr).',
    ],
  },
  {
    id: 5,
    kicker: 'Passage 05 · Consciousness',
    title: 'Where Is Heaven Hiding?',
    preview:
      "Where is heaven? The base structure of reality is consciousness. Close your eyes and imagine an apple — you see it, but it isn't in your brain physically. So where is it? Perhaps heaven and hell are not far away, but a different frequency on the same plane of existence.",
    body: [
      'Where is heaven? There was no reason to be confused for so long. What is the base structure of reality? It is consciousness.',
      'Consciousness is your subjective awareness of yourself and the world. Perception is the software that downloads sensory data, organizes it, and paints a meaningful picture on the screen. Consciousness is like the waves; perception is the ocean.',
      "At the very least, your mental self differs from your physical self. Close your eyes and imagine an apple — you see it, but can you touch it? It's in your imagination. Where is that? Even if you say it's in your brain, the apple's existence overlaps your brain's physical existence — it is not stored there. So the other realms — heaven and hell — may exist where the physical realm and the unseen overlap: meshed together, different frequencies in the same plane of existence.",
      'We travel two ways physically — through space (walking, moving) and through time (sitting while time passes). But there is a third way: perception. Where do you go when you dream? Your mental process is on a different plane, a different frequency. Mental travel is never accounted for — which is why heaven and hell can exist on a mental plane. What happens to your body after death? It disappears. What remains? Your mind. That is what travels — perception. You cannot travel there physically, not because the realm is bad, but because nothing physical of you remains to travel. That is why the astral self travels.',
      'This answers how we have free will. The seven heavens are mentioned repeatedly in the Quran. We are told that when we sleep, the soul ascends yet remains rooted in the body, and we are returned as a mercy. So you travel not only horizontally but vertically, simultaneously. When you sleep, your position is fixed — no more decisions — and your standing is decided by the choices you make throughout life, not with your body, but your soul.',
      "Last night you slept; the body lay on the bed, but you were elsewhere. So which one were you? It was a dream — yet did it feel real? Yes. Who decides what's real? Did you check your face, your hands, in the dream? Did anyone ask who you were? No — yet you knew you existed, automatically, without a mirror or confirmation. The brain mutes the body's signals in sleep: you can't feel your hands or legs, can't breathe consciously — yet 'I' am at full volume. The body wasn't there, yet I was. So the body isn't the source. Place a glass in a river: the water molds to the glass, so it seems the water is the glass. The body is like that; I mold into it, so it seems we are one. We think, 'I am inside the body' — but what if the body is inside me? Just as a dream is inside the mind, and the whole world is inside the dream.",
      "Then one question remains: Why are we here? Allah has many names and needs nothing. The universe — and our very existence — is a mere echo of Allah being something. A perfect analogy my father gave me: a hammer hitting stone. The hammer does not need the sound; the sound is the effect of the hammer striking. Allah is Ar-Rahman — He does not need us to be Ar-Rahman — yet the universe self-organized into a structure complex enough to hold conscious souls making moral choices. The structure emerged to serve the attribute. Ask questions — but do not ask them in doubt.",
    ],
  },
  {
    id: 6,
    kicker: 'Passage 06 · Fasting',
    title: 'Fasting Sharpens the Soul',
    preview:
      'You can strengthen your Ruhaniyat with fasting. "Fasting is prescribed for you, as it was for those before you, so that you may learn self-restraint (Taqwa)." — Surah Al-Baqarah 2:183.',
    body: [
      "You can strengthen your Ruhaniyat with fasting. In the Quran, Allāhu Subḥānahu wa Taʿālā says: \u201cO you who believe! Fasting is prescribed for you, as it was prescribed for those before you, so that you may learn self-restraint (Taqwa).\u201d — Surah Al-Baqarah (2:183).",
      'Taqwa is willpower and spirituality. Fast properly with Sehri and Iftar, and your body begins consuming its older cells — you repair your body through fasting, which is clinically supported. The brain also works more efficiently on an empty stomach. If you want to test whether your Ruhaniyat is becoming solid, try fasting — but not more than three days in a week.',
    ],
  },
  {
    id: 7,
    kicker: 'Passage 07 · Perception',
    title: 'The Eye They Tried to Close',
    preview:
      'A widely circulated claim attributed to Jim Carrey: that opening the "third eye" — the pineal gland — unlocks abilities most people call science fiction, and that powerful interests have long tried to keep it dormant. Presented here as one of the provocative ideas people debate.',
    body: [
      "A widely circulated claim, attributed to Jim Carrey: \u201cOpening my third eye cost me my career in Hollywood, but I'd do it again. If I showed you what people can do when the pineal gland is activated, you'd understand why they tried to silence me. When this inner eye opens, a human gains access to things most people call science fiction — clairvoyance, telekinesis, manifestation through the power of the mind.\u201d",
      'The story continues: for seventeen years he stayed silent — grand mansions, solstice gatherings among the powerful — and claims a handful of families steer billions through banks, media, and governments, with one objective: keep everyone blind, weak, and obedient. In 1958 the Food Additives Amendment allowed additives into food, said to preserve it; the claim is that it was really about calcifying the population\u2019s pineal gland. They don\u2019t want superhumans, the story says — they want people distracted and trapped inside the system.',
      'Would such people remain in power, it asks, if our pineal glands functioned at 100%? A 1954 mission supposedly sought whether a human could develop spiritual abilities; a year later a silent race began across nations, all chasing one goal — to activate the third eye. Today, only a tiny fraction are said to have theirs open.',
      'A note on truth: this is an unverified, sensational claim, not a documented statement. It is included here precisely because it is the kind of idea people share and argue over — and because discerning truth from spectacle is the whole point.',
    ],
  },
  {
    id: 8,
    kicker: 'Passage 08 · Wisdom',
    title: 'Why Pork Was Forbidden',
    preview:
      'Out of thousands of animals, why was this one singled out and repeated in the Quran? Fourteen centuries before microscopes, revelation named a risk that laboratories would only confirm much later.',
    feature: true,
    body: [
      'Why did Allah specifically forbid pork and mention it repeatedly in the Quran? Out of thousands of animals humans eat, why was this one singled out?',
      'Fourteen centuries ago there were no microscopes, no laboratories, no knowledge of germs. Yet inside every piece of meat exists an unseen world. Scientists later found that pigs can carry parasites capable of infecting humans — the pork tapeworm can enter the body and, in severe cases, reach organs and cause serious complications. Researchers have also studied bacteria and viruses that spread through contaminated pork.',
      'But here is the surprising part: these discoveries do not fully explain the prohibition, because the Quran never says pork is forbidden only because of disease. Allah says: \u201cForbidden to you are carrion, blood, the flesh of swine\u2026\u201d (Surah Al-Māʾidah 5:3). The command came long before laboratories confirmed the risks. History repeatedly shows that humans discover realities long after they already exist — some wisdoms become visible through science, others remain beyond us.',
      'For a believer, the deepest reason is not what science finds, but trust in the One whose knowledge has no limits. A microscope can reveal hidden organisms, but revelation guides humanity even before the microscope arrives.',
    ],
  },
  {
    id: 9,
    kicker: 'Passage 09 · Conviction',
    title: 'Follow the Creator, Not the Crowd',
    preview:
      'Haram is haram, even if the whole world is doing it. Halal is halal, even if nobody is. Trust the Creator and His words — not the creation.',
    body: [
      'Haram is haram, even if the whole world is doing it. Halal is halal, even if nobody is doing it. Trust the Creator and His words in the Quran, not the creation.',
      'The Quran is perfectly preserved and the Hadiths carry such integrity because Allah wants you to follow Him — the prophets and the companions — instead of the world. He knew that cultures, nations, tribes, and ethnicities would, in some way, taint the deen, and that bidʿah (innovation) would rise in the ummah. That is why the sources were preserved: so you would reference them, not what others do.',
      'Do not follow your influencers. Do not follow me. Do not follow the leaders around you blindly. Question what they say. Question what I say. Question what your parents say. That is the beauty of Islam.',
    ],
  },
  {
    id: 10,
    kicker: 'Passage 10 · Signs',
    title: 'The Barrier Between Two Seas',
    preview:
      'The Quran described a secret of the oceans 1,400 years ago that science only recently confirmed: where fresh water meets salt water, an invisible barrier keeps them from fully mixing.',
    body: [
      'Did you know the Quran revealed a secret about the oceans over 1,400 years ago that science only discovered recently? In Surah Al-Furqan (25:53): \u201cAnd it is He who has released the two seas, one fresh and sweet and one salty and bitter, and He placed between them a barrier they cannot cross.\u201d',
      "Here is the amazing part: scientists discovered that when fresh water and salt water meet, they don't fully mix. An invisible barrier called a halocline keeps them separate. This wasn't known 1,400 years ago, yet the Qur'an described it perfectly — another sign that it holds knowledge far ahead of its time.",
    ],
  },
  {
    id: 11,
    kicker: 'Passage 11 · Language',
    title: 'The Word Beyond Translation',
    preview:
      'Check any English translation of Surah Al-Ikhlas and the word "As-Samad" is rendered differently every time. None of them agree — and yet all are correct, because the word is simply too vast for any single language.',
    body: [
      "If you check the English translation of Surah Al-Ikhlas, you'll find something strange. Look at the word \u201cAs-Samad\u201d in the second ayah. In almost every English translation it is rendered differently — none of them agree.",
      'Here is the crazy part: they are all correct, yet all incomplete. The Arabic word \u201cAs-Samad\u201d is so vast there is no equivalent in English or any language. It simultaneously means: the Eternal; the ultimate destination everyone turns to in need; the One who needs nothing while everything needs Him; the One who does not eat or drink; the impenetrable; and the ultimate Master of all creation.',
      "It takes an entire paragraph to explain this one two-syllable word. Read only the translation and you get a fraction of the meaning. There is even a psychological study on an Amazonian tribe showing exactly why this happens — how language shapes the very limits of what we can express.",
    ],
  },
  {
    id: 12,
    kicker: 'Passage 12 · Society',
    title: 'The Ruler We Deserve',
    preview:
      '"And thus We make the wrongdoers allies of one another because of what they used to earn." — Surah Al-Anʿam 6:129. Before questioning the system, question yourself.',
    feature: true,
    body: [
      'Surah Al-Anʿam (6:129): \u201cAnd thus We make the wrongdoers allies of one another because of what they used to earn.\u201d',
      "This is why systems don't change. We rage at the education ministry, yet abuse the government online only when we can't cheat in the exam hall. We throw a chips packet from a moving bus, then complain when it clogs a drain. When hawkers seize the footpath and force us onto the road, we shout that no one follows traffic law. We say the government fails to stop crime, yet we scold an old rickshaw puller over five taka. Where power is easy to apply, we apply it.",
      "To save a matchstick we burn the government's gas for hours — then complain when cylinder prices rise. We say ministers ignore our suffering, yet we sell our vote for a few thousand taka. We complain of unemployment and nepotism, yet after twenty-five years of study we have gained no skill beyond a bundle of certificates.",
      'When a society drifts from truth and honesty and neglects its responsibilities, then Allāhu Subḥānahu wa Taʿālā appoints over it a ruler who does injustice — not because Allah is like the oppressors, but as a warning and a consequence of the people\u2019s own irresponsibility. Every great change begins with changing yourself. Before questioning the system, question yourself.',
    ],
  },
  {
    id: 13,
    kicker: 'Passage 13 · The Ego',
    title: 'Fire, Clay, and the Ego',
    preview:
      'The Quran presents Iblees not as mythology but as a case study. He did not deny Allah — he rejected position, certain that fire was better than clay. In systems theory, the rigid collapse and the adaptable survive.',
    body: [
      'The Quran does not present the story of Iblees as mythology; it presents it as a case study. Allah created Adam and commanded the angels to bow — not in worship, but in recognition of a new form of consciousness. Surah Al-Ḥijr (15:29): \u201cSo when I have proportioned him and breathed into him of My Spirit, then fall down to him in prostration.\u201d The command came after He placed the spirit into him, not before.',
      "All obeyed except one. Iblees did not deny Allah, nor reject creation. He rejected position — because, in his view, he was better: created from fire, while Adam was made from clay. Allah asked, \u201cWhat prevented you from prostrating when I commanded you?\u201d He replied, \u201cI am better than he is: You created me from fire and him from clay.\u201d (Al-Aʿraf 12)",
      'The core contrast: the \u201cFire\u201d mindset (Iblees) is defined by status and a rigid self-image; it consumes and destroys because it cannot handle being wrong. The \u201cClay\u201d mindset (Adam) is defined by humility and adaptability; it stays grounded, learns, and grows.',
      'In systems theory, rigid systems collapse and adaptive systems survive. Iblees was rigid; Adam was teachable. Allah taught Adam names, meaning, and language — the ability to learn, revise, and grow. Commanded to bow, Iblees could not adapt his self-image, so he fell — not because Allah needed obedience, but because ego cannot coexist with truth.',
      'Allah is not unjust; Iblees chose his state. The Quran warns against arrogance not merely because it angers Allah, but because it disconnects the mind from reality. Iblees is a pattern we see daily: when intelligence becomes pride and status replaces curiosity, growth ends. Any time we refuse correction, justify harm through superiority, or reject truth because it threatens identity — we echo that same logic. And here is the mercy: Allah did not remove his ability to choose. His fall is not about fire or hellfire; it is about misaligned consciousness. The Quran invites us to choose differently — to stay grounded, to remain teachable, to bow not to people, but to truth.',
    ],
  },
  {
    id: 15,
    kicker: 'Passage 15 · Intuition',
    title: 'Beyond the Limits of Logic',
    preview:
      'Logic only exists to limit you. It is the police that checks whether reasoning is correct — but it never generates a single idea. Every theory is born of intuition; logic only makes it airtight afterward.',
    body: [
      'Logic is holding you back. In fact, logic only exists to limit you. How do you know something can exist or is real? You reason. And what is logic? The police that checks whether reasoning is correct.',
      'Reasoning works on three axes: deductive, inductive, and abductive. Deductive reasoning does not exist in the physical world; abductive reasoning is nearly fiction. Inductive reasoning is what most confuse with logic. Five apples sit in a row — what comes next? If you say \u201can apple,\u201d that is induction. Because the earth has orbited the sun for a million years, we assume it always will. But repetition in your data does not guarantee repetition — that is the problem of induction, the great hole in logic.',
      "What is the point of this police? It only holds back possibilities and makes things sound reasonable. But does logic ever give you ideas? Has it produced inventions, or theories about the universe? Name one theory born of logic and not intuition — you can't. Logic corrects theories and makes them airtight, but it can never generate possibility.",
      'Intuition is how you connect to the entirety of reality — where the downloads come from, where ideas are born. Intuition is the possibility field. To capture reality, get ideas, and do something extraordinary, you must capture that intuition and add one thing: conviction. It will happen. The theory will be proven true. Possibility comes into you; add conviction. That is how it is done — not by logic.',
    ],
  },
];

/**
 * Passage 14 — powers the "Our Story" timeline section on prayer.
 * `items` mirrors cocoon-template's Timeline entries (label + description),
 * rendered top-to-bottom exactly in this order — first item gets the
 * pulsing "active" dot, last gets the faint one, same as the template.
 */
export const PRAYER_STORY = {
  kicker: 'Salah',
  title: 'Five postures, one return to Allah',
  intro:
    'People often hear that Muslims pray five times a day, but prayer is far more than a ritual — it is a sequence of postures, each one a sentence spoken with the whole body.',
  items: [
    { label: 'Takbeer', text: 'It\u2019s like when you go \u201cAllahu Akbar\u201d — it\u2019s like the world is behind me.' },
    { label: 'Al Qayyam', text: 'My hands are tied. I\u2019m not being occupied with anything.' },
    { label: 'Rukku', text: 'You bow down, I bow to your knowledge.' },
    { label: 'Qiyam', text: 'I stand in your awe.' },
    { label: 'Sajdah', text: 'I bow as your servant.' },
  ],
} as const;
