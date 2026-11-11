/**
 * Follow a course: a syllabus (PDF or photos) is read once and becomes a course item with its units
 * in order. The roadmap then follows those units (roadmap/job.ts reads `course_units`).
 */
import { and, asc, eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { analyses, courseUnits, items } from '$lib/server/db/schema';
import { generateJson } from '$lib/server/ai';
import { withCredits } from '$lib/server/features/credits/service';
import { remember } from '$lib/server/features/memory/service';
import { timezoneOf } from '$lib/server/features/plan/context';
import { today } from '$lib/server/features/plan/dates';
import type { CourseInput } from './input';
import { ABOUT_MARK } from '$lib/server/features/items/about';
import { normalizeCourse, type CourseUnit } from './normalize';
import { COURSE_SYSTEM, coursePrompt } from './prompt';

type Platform = App.Platform | undefined;

/** Course reading writes long replies for long syllabuses. */
const COURSE_MAX_TOKENS = 6000;

export type ImportResult =
	| { status: 'imported'; item: typeof items.$inferSelect; units: CourseUnit[] }
	| { status: 'unreadable'; reason: string };

export async function importCourse(
	platform: Platform,
	userId: string,
	input: CourseInput
): Promise<ImportResult> {
	const now = await withDb(platform, async (db) => today(await timezoneOf(db, userId)));
	const files = input.files.map((f) => ({
		mime: f.mime,
		bytes: Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0))
	}));

	const course = await withCredits(
		platform,
		userId,
		'course',
		async () => {
			const result = await generateJson(platform, {
				system: COURSE_SYSTEM,
				prompt: coursePrompt({ title: input.title, note: input.note, today: now }),
				files,
				maxTokens: COURSE_MAX_TOKENS
			});
			const course = normalizeCourse(result.data);
			// Thrown inside withCredits, so an unreadable syllabus is refunded.
			if (course.units.length === 0) throw new Error('No units found in the syllabus');
			return course;
		},
		{ ref: 'course' }
	).catch((e: unknown) => {
		if (e instanceof Error && /No units found/.test(e.message)) return null;
		throw e;
	});
	if (!course) {
		return {
			status: 'unreadable',
			reason: 'No units could be read. Try clearer photos, or the PDF itself.'
		};
	}

	const title = input.title ?? (course.title || 'Course');
	const item = await withDb(platform, (db) =>
		db.transaction(async (tx) => {
			if (input.itemId) {
				// Fill in the thing the user already saved.
				const [existing] = await tx
					.update(items)
					.set({
						status: 'ready',
						intent: 'course',
						practiceKind: course.practiceKind,
						goal: course.goal,
						targetDate: course.examDate,
						author: course.provider,
						note: `${ABOUT_MARK} Syllabus uploaded: ${course.units.length} units${course.examDate ? `, exam on ${course.examDate}` : ''}${input.note ? `. ${input.note}` : ''}`,
						intentConfirmedAt: new Date()
					})
					.where(and(eq(items.id, input.itemId), eq(items.userId, userId)))
					.returning();
				if (existing) {
					await tx.delete(courseUnits).where(eq(courseUnits.itemId, existing.id));
					await tx.insert(courseUnits).values(
						course.units.map((u, i) => ({
							itemId: existing.id,
							position: i,
							title: u.title,
							topics: u.topics,
							unitDate: u.date
						}))
					);
					return existing;
				}
			}
			const [item] = await tx
				.insert(items)
				.values({
					userId,
					title,
					titleFromUser: Boolean(input.title),
					captureType: 'upload',
					note: input.note ?? null,
					// Read already: the syllabus reading is its analysis.
					status: 'ready',
					intent: 'course',
					practiceKind: course.practiceKind,
					goal: course.goal,
					targetDate: course.examDate,
					author: course.provider
				})
				.returning();
			await tx.insert(analyses).values({
				itemId: item.id,
				summary: course.summary || null,
				skills: course.skills,
				attribution: course.provider,
				model: 'syllabus'
			});
			await tx.insert(courseUnits).values(
				course.units.map((u, i) => ({
					itemId: item.id,
					position: i,
					title: u.title,
					topics: u.topics,
					unitDate: u.date
				}))
			);
			return item;
		})
	);

	await remember(platform, userId, {
		type: 'learning_goal',
		summary: `Following a course: ${title}${course.provider ? ` (${course.provider})` : ''}, ${course.units.length} units${course.examDate ? `, exam on ${course.examDate}` : ''}. ${course.summary}`,
		sourceType: 'item',
		sourceId: item.id
	}).catch((e) => console.error('[courses] remember failed', e));

	return { status: 'imported', item, units: course.units };
}

/** A course item's units in order (empty for anything that isn't a course). */
export function unitsOf(platform: Platform, itemId: string) {
	return withDb(platform, (db) =>
		db
			.select()
			.from(courseUnits)
			.where(eq(courseUnits.itemId, itemId))
			.orderBy(asc(courseUnits.position))
	);
}
