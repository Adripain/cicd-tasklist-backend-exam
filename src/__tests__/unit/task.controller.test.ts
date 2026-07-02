import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import type { Task } from "@prisma/client";

vi.mock("../../services/task.service.js", () => ({
	findAll: vi.fn(),
	findById: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	remove: vi.fn(),
}));

import * as taskService from "../../services/task.service.js";
import * as taskController from "../../controllers/task.controller.js";

const mockService = vi.mocked(taskService);

const task: Task = {
	id: 1,
	title: "Test Task",
	description: "Test description",
	completed: false,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function req(data: Partial<Request> = {}): Request {
	return { params: {}, body: {}, ...data } as Request;
}

function res(): Response {
	return {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		send: vi.fn().mockReturnThis(),
	} as unknown as Response;
}

describe("TaskController", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns all tasks", async () => {
		mockService.findAll.mockResolvedValue([task]);
		const response = res();

		await taskController.getAllTasks(req(), response);

		expect(response.status).toHaveBeenCalledWith(200);
		expect(response.json).toHaveBeenCalledWith([task]);
	});

	it("returns a task by id", async () => {
		mockService.findById.mockResolvedValue(task);
		const response = res();

		await taskController.getTaskById(req({ params: { id: "1" } as any }), response);

		expect(mockService.findById).toHaveBeenCalledWith(1);
		expect(response.status).toHaveBeenCalledWith(200);
		expect(response.json).toHaveBeenCalledWith(task);
	});

	it("rejects an invalid id", async () => {
		const response = res();

		await taskController.getTaskById(req({ params: { id: "abc" } as any }), response);

		expect(response.status).toHaveBeenCalledWith(400);
		expect(response.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
	});

	it("returns 404 when a task does not exist", async () => {
		mockService.findById.mockResolvedValue(null);
		const response = res();

		await taskController.getTaskById(req({ params: { id: "99" } as any }), response);

		expect(response.status).toHaveBeenCalledWith(404);
		expect(response.json).toHaveBeenCalledWith({ error: "Task not found" });
	});

	it.each([{}, { title: 123 }, { title: "   " }])(
		"rejects an invalid title",
		async (body) => {
			const response = res();

			await taskController.createTask(req({ body }), response);

			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.json).toHaveBeenCalledWith({
				error: "Title is required and must be a non-empty string",
			});
		}
	);

	it("creates a task", async () => {
		mockService.create.mockResolvedValue(task);
		const response = res();

		await taskController.createTask(
			req({ body: { title: "  Test Task  ", description: "Test description" } }),
			response
		);

		expect(mockService.create).toHaveBeenCalledWith({
			title: "Test Task",
			description: "Test description",
		});
		expect(response.status).toHaveBeenCalledWith(201);
	});

	it("returns 500 when create fails", async () => {
		mockService.create.mockRejectedValue(new Error("Database error"));
		const response = res();

		await taskController.createTask(req({ body: { title: "Task" } }), response);

		expect(response.status).toHaveBeenCalledWith(500);
		expect(response.json).toHaveBeenCalledWith({ error: "Failed to create task" });
	});

	it("updates a task", async () => {
		const updatedTask = { ...task, completed: true };
		mockService.update.mockResolvedValue(updatedTask);
		const response = res();

		await taskController.updateTask(
			req({ params: { id: "1" } as any, body: { completed: true } }),
			response
		);

		expect(mockService.update).toHaveBeenCalledWith(1, {
			title: undefined,
			description: undefined,
			completed: true,
		});
		expect(response.status).toHaveBeenCalledWith(200);
		expect(response.json).toHaveBeenCalledWith(updatedTask);
	});

	it("rejects an invalid id when updating", async () => {
		const response = res();

		await taskController.updateTask(req({ params: { id: "abc" } as any }), response);

		expect(response.status).toHaveBeenCalledWith(400);
		expect(response.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
	});

	it("returns 404 when updating a missing task", async () => {
		mockService.update.mockRejectedValue(new Error("Task not found"));
		const response = res();

		await taskController.updateTask(
			req({ params: { id: "99" } as any, body: { completed: true } }),
			response
		);

		expect(response.status).toHaveBeenCalledWith(404);
		expect(response.json).toHaveBeenCalledWith({ error: "Task not found" });
	});

	it("returns 500 when update fails", async () => {
		mockService.update.mockRejectedValue(new Error("Database error"));
		const response = res();

		await taskController.updateTask(
			req({ params: { id: "1" } as any, body: { completed: true } }),
			response
		);

		expect(response.status).toHaveBeenCalledWith(500);
		expect(response.json).toHaveBeenCalledWith({ error: "Failed to update task" });
	});

	it("deletes a task", async () => {
		mockService.remove.mockResolvedValue(task);
		const response = res();

		await taskController.deleteTask(req({ params: { id: "1" } as any }), response);

		expect(mockService.remove).toHaveBeenCalledWith(1);
		expect(response.status).toHaveBeenCalledWith(204);
		expect(response.send).toHaveBeenCalled();
	});

	it("rejects an invalid id when deleting", async () => {
		const response = res();

		await taskController.deleteTask(req({ params: { id: "abc" } as any }), response);

		expect(response.status).toHaveBeenCalledWith(400);
		expect(response.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
	});

	it("returns 404 when deleting a missing task", async () => {
		mockService.remove.mockRejectedValue(new Error("Task not found"));
		const response = res();

		await taskController.deleteTask(req({ params: { id: "99" } as any }), response);

		expect(response.status).toHaveBeenCalledWith(404);
		expect(response.json).toHaveBeenCalledWith({ error: "Task not found" });
	});

	it("returns 500 when delete fails", async () => {
		mockService.remove.mockRejectedValue(new Error("Database error"));
		const response = res();

		await taskController.deleteTask(req({ params: { id: "1" } as any }), response);

		expect(response.status).toHaveBeenCalledWith(500);
		expect(response.json).toHaveBeenCalledWith({ error: "Failed to delete task" });
	});
});
