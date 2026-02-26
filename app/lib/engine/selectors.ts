const crScale = [
	0,
	0.125,
	0.25,
	0.5,
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	9,
	10,
	11,
	12,
	13,
	14,
	15,
	16,
	17,
	18,
	19,
	20,
	21,
	22,
	23,
	24,
	25,
	26,
	27,
	28,
	29,
	30,
];

const fractionLabels: Record<number, string> = {
	0: "0",
	0.125: "1/8",
	0.25: "1/4",
	0.5: "1/2",
};

const defensiveHpBands: Array<{ maxHp: number; cr: number }> = [
	{ maxHp: 6, cr: 0 },
	{ maxHp: 35, cr: 0.125 },
	{ maxHp: 49, cr: 0.25 },
	{ maxHp: 70, cr: 0.5 },
	{ maxHp: 85, cr: 1 },
	{ maxHp: 100, cr: 2 },
	{ maxHp: 115, cr: 3 },
	{ maxHp: 130, cr: 4 },
	{ maxHp: 145, cr: 5 },
	{ maxHp: 160, cr: 6 },
	{ maxHp: 175, cr: 7 },
	{ maxHp: 190, cr: 8 },
	{ maxHp: 205, cr: 9 },
	{ maxHp: 220, cr: 10 },
	{ maxHp: 235, cr: 11 },
	{ maxHp: 250, cr: 12 },
	{ maxHp: 265, cr: 13 },
	{ maxHp: 280, cr: 14 },
	{ maxHp: 295, cr: 15 },
	{ maxHp: 310, cr: 16 },
	{ maxHp: 325, cr: 17 },
	{ maxHp: 340, cr: 18 },
	{ maxHp: 355, cr: 19 },
	{ maxHp: 400, cr: 20 },
	{ maxHp: 445, cr: 21 },
	{ maxHp: 490, cr: 22 },
	{ maxHp: 535, cr: 23 },
	{ maxHp: 580, cr: 24 },
	{ maxHp: 625, cr: 25 },
	{ maxHp: 670, cr: 26 },
	{ maxHp: 715, cr: 27 },
	{ maxHp: 760, cr: 28 },
	{ maxHp: 805, cr: 29 },
	{ maxHp: Number.POSITIVE_INFINITY, cr: 30 },
];

const normalize = (value: string) => value.trim().toLowerCase();

const xpByChallenge: Record<string, number> = {
	"0": 10,
	"1/8": 25,
	"1/4": 50,
	"1/2": 100,
	"1": 200,
	"2": 450,
	"3": 700,
	"4": 1100,
	"5": 1800,
	"6": 2300,
	"7": 2900,
	"8": 3900,
	"9": 5000,
	"10": 5900,
	"11": 7200,
	"12": 8400,
	"13": 10000,
	"14": 11500,
	"15": 13000,
	"16": 15000,
	"17": 18000,
	"18": 20000,
	"19": 22000,
	"20": 25000,
	"21": 33000,
	"22": 41000,
	"23": 50000,
	"24": 62000,
	"25": 75000,
	"26": 90000,
	"27": 105000,
	"28": 120000,
	"29": 135000,
	"30": 155000,
};

const thresholdsByLevel: Record<number, { easy: number; medium: number; hard: number; deadly: number }> = {
	1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
	2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
	3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
	4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
	5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
	6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
	7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
	8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
	9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
	10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
	11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
	12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
	13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
	14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
	15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
	16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
	17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
	18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
	19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
	20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
};

export type EncounterDifficulty = "No Party" | "Trivial" | "Easy" | "Medium" | "Hard" | "Deadly";

export type EncounterDifficultyBreakdown = {
	difficulty: EncounterDifficulty;
	baseXp: number;
	multiplier: number;
	adjustedXp: number;
	thresholds: {
		easy: number;
		medium: number;
		hard: number;
		deadly: number;
	};
};

const multiplierByMonsterCount = (count: number) => {
	if (count <= 1) {
		return 1;
	}
	if (count === 2) {
		return 1.5;
	}
	if (count <= 6) {
		return 2;
	}
	if (count <= 10) {
		return 2.5;
	}
	if (count <= 14) {
		return 3;
	}
	return 4;
};

const shiftedMultiplier = (count: number, partySize: number) => {
	const bands = [1, 1.5, 2, 2.5, 3, 4];
	const current = multiplierByMonsterCount(count);
	const index = Math.max(0, bands.findIndex((band) => band === current));
	if (partySize <= 3) {
		return bands[Math.min(bands.length - 1, index + 1)];
	}
	if (partySize >= 6) {
		return bands[Math.max(0, index - 1)];
	}
	return current;
};

export const getChallengeXp = (challenge: string) => {
	const normalized = challenge.trim();
	if (normalized in xpByChallenge) {
		return xpByChallenge[normalized];
	}
	const parsed = parseChallenge(normalized);
	const parsedKey = `${Math.round(parsed)}`;
	return xpByChallenge[parsedKey] ?? 0;
};

export const getTotalChallenge = (challenges: string[]) =>
	challenges.reduce((sum, challenge) => sum + parseChallenge(challenge), 0);

export const formatTotalChallenge = (value: number) => {
	if (value === 0) {
		return "0";
	}
	const rounded = value >= 10 ? value.toFixed(1) : value.toFixed(2);
	return rounded.replace(/\.0$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
};

export const evaluateEncounterDifficulty = (
	monsterChallenges: string[],
	partyLevels: number[]
): EncounterDifficulty => {
	return getEncounterDifficultyBreakdown(monsterChallenges, partyLevels).difficulty;
};

export const getEncounterDifficultyBreakdown = (
	monsterChallenges: string[],
	partyLevels: number[]
): EncounterDifficultyBreakdown => {
	if (!partyLevels.length) {
		return {
			difficulty: "No Party",
			baseXp: 0,
			multiplier: 1,
			adjustedXp: 0,
			thresholds: { easy: 0, medium: 0, hard: 0, deadly: 0 },
		};
	}
	if (!monsterChallenges.length) {
		const thresholds = partyLevels.reduce(
			(acc, rawLevel) => {
				const level = Math.max(1, Math.min(20, Math.floor(rawLevel)));
				const perLevel = thresholdsByLevel[level] ?? thresholdsByLevel[1];
				return {
					easy: acc.easy + perLevel.easy,
					medium: acc.medium + perLevel.medium,
					hard: acc.hard + perLevel.hard,
					deadly: acc.deadly + perLevel.deadly,
				};
			},
			{ easy: 0, medium: 0, hard: 0, deadly: 0 }
		);
		return {
			difficulty: "Trivial",
			baseXp: 0,
			multiplier: 1,
			adjustedXp: 0,
			thresholds,
		};
	}

	const baseXp = monsterChallenges.reduce((sum, challenge) => sum + getChallengeXp(challenge), 0);
	const multiplier = shiftedMultiplier(monsterChallenges.length, partyLevels.length);
	const adjustedXp = Math.round(baseXp * multiplier);

	const thresholds = partyLevels.reduce(
		(acc, rawLevel) => {
			const level = Math.max(1, Math.min(20, Math.floor(rawLevel)));
			const perLevel = thresholdsByLevel[level] ?? thresholdsByLevel[1];
			return {
				easy: acc.easy + perLevel.easy,
				medium: acc.medium + perLevel.medium,
				hard: acc.hard + perLevel.hard,
				deadly: acc.deadly + perLevel.deadly,
			};
		},
		{ easy: 0, medium: 0, hard: 0, deadly: 0 }
	);

  const difficulty: EncounterDifficulty =
		adjustedXp < thresholds.easy
			? "Trivial"
			: adjustedXp < thresholds.medium
				? "Easy"
				: adjustedXp < thresholds.hard
					? "Medium"
					: adjustedXp < thresholds.deadly
						? "Hard"
						: "Deadly";

	return {
		difficulty,
		baseXp,
		multiplier,
		adjustedXp,
		thresholds,
	};
};

export const fuzzyIncludes = (query: string, text: string) => {
	const q = normalize(query);
	if (!q) {
		return true;
	}
	const source = normalize(text);
	let qIndex = 0;
	for (let sourceIndex = 0; sourceIndex < source.length; sourceIndex += 1) {
		if (source[sourceIndex] === q[qIndex]) {
			qIndex += 1;
			if (qIndex === q.length) {
				return true;
			}
		}
	}
	return false;
};

export const parseChallenge = (value: string): number => {
	const trimmed = value.trim();
	if (!trimmed) {
		return 0;
	}
	if (trimmed.includes("/")) {
		const [numerator, denominator] = trimmed.split("/").map(Number);
		if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
			return 0;
		}
		return numerator / denominator;
	}
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : 0;
};

export const formatChallenge = (value: number): string => {
	if (value in fractionLabels) {
		return fractionLabels[value];
	}
	return `${Math.round(value)}`;
};

export const estimateChallengeFromDefenses = (hp: number, ac: number): string => {
	const safeHp = Math.max(1, Math.floor(hp));
	const safeAc = Math.max(1, Math.floor(ac));
	const hpCr = defensiveHpBands.find((band) => safeHp <= band.maxHp)?.cr ?? 30;
	const baseIndex = crScale.indexOf(hpCr);
	const acShift = Math.floor((safeAc - 13) / 2);
	const adjustedIndex = Math.max(0, Math.min(crScale.length - 1, baseIndex + acShift));
	return formatChallenge(crScale[adjustedIndex]);
};

export const suggestUniqueName = (baseName: string, existingNames: string[]) => {
	const trimmedBase = baseName.trim();
	if (!trimmedBase) {
		return "";
	}
	const normalizedSet = new Set(existingNames.map((name) => normalize(name)));
	let index = 1;
	let candidate = `${trimmedBase} ${index}`;
	while (normalizedSet.has(normalize(candidate))) {
		index += 1;
		candidate = `${trimmedBase} ${index}`;
	}
	return candidate;
};
