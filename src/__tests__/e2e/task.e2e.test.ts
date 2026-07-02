import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import testPrisma from "./setup.js";
import request from "supertest";

vi.mock("../../lib/prisma.js", () => ({
	default: testPrisma,
}));

const { default: app } = await import("../../app.js");

describe("Task API E2E Tests", () => {
	beforeEach(async () => {
		await testPrisma.task.deleteMany();
	});

	afterAll(async () => {
		await testPrisma.$disconnect();
	});

	it("creates a task", async () => {
		const res = await request(app)
			.post("/api/tasks")
			.send({ title: "E2E Task", description: "E2E Description" });

		expect(res.status).toBe(201);
		expect(res.body.title).toBe("E2E Task");
		expect(res.body.description).toBe("E2E Description");
	});

	it.each([{}, { title: 123 }, { title: "   " }])(
		"rejects an invalid title",
		async (body) => {
			const res = await request(app).post("/api/tasks").send(body);

			expect(res.status).toBe(400);
			expect(res.body).toEqual({
				error: "Title is required and must be a non-empty string",
			});
		}
	);

	it("lists tasks", async () => {
		await testPrisma.task.create({ data: { title: "First task" } });
		await testPrisma.task.create({ data: { title: "Second task" } });

		const res = await request(app).get("/api/tasks");

		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(2);
	});

	it("returns one task", async () => {
		const task = await testPrisma.task.create({ data: { title: "Find me" } });

		const res = await request(app).get(`/api/tasks/${task.id}`);

		expect(res.status).toBe(200);
		expect(res.body.title).toBe("Find me");
	});

	it("returns 404 for a missing task", async () => {
		const res = await request(app).get("/api/tasks/999");

		expect(res.status).toBe(404);
		expect(res.body).toEqual({ error: "Task not found" });
	});

	it("rejects an invalid id on get", async () => {
		const res = await request(app).get("/api/tasks/abc");

		expect(res.status).toBe(400);
		expect(res.body).toEqual({ error: "Invalid task ID" });
	});

	it("updates a task", async () => {
		const task = await testPrisma.task.create({ data: { title: "Before update" } });

		const res = await request(app)
			.put(`/api/tasks/${task.id}`)
			.send({ title: "After update", completed: true });

		expect(res.status).toBe(200);
		expect(res.body.title).toBe("After update");
		expect(res.body.completed).toBe(true);
	});

	it("returns 404 when updating a missing task", async () => {
		const res = await request(app).put("/api/tasks/999").send({ completed: true });

		expect(res.status).toBe(404);
		expect(res.body).toEqual({ error: "Task not found" });
	});

	it("rejects an invalid id on update", async () => {
		const res = await request(app).put("/api/tasks/abc").send({ completed: true });

		expect(res.status).toBe(400);
		expect(res.body).toEqual({ error: "Invalid task ID" });
	});

	it("deletes a task", async () => {
		const task = await testPrisma.task.create({ data: { title: "Delete me" } });

		const res = await request(app).delete(`/api/tasks/${task.id}`);
		const deletedTask = await testPrisma.task.findUnique({ where: { id: task.id } });

		expect(res.status).toBe(204);
		expect(deletedTask).toBeNull();
	});

	it("returns 404 when deleting a missing task", async () => {
		const res = await request(app).delete("/api/tasks/999");

		expect(res.status).toBe(404);
		expect(res.body).toEqual({ error: "Task not found" });
	});

	it("rejects an invalid id on delete", async () => {
		const res = await request(app).delete("/api/tasks/abc");

		expect(res.status).toBe(400);
		expect(res.body).toEqual({ error: "Invalid task ID" });
	});
});
