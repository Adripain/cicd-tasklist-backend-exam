import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Task } from "@prisma/client";

vi.mock("../../lib/prisma.js", () => ({
	default: {
		task: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
	},
}));

import prisma from "../../lib/prisma.js";
import * as taskService from "../../services/task.service.js";

const mockPrisma = vi.mocked(prisma);

const task: Task = {
	id: 1,
	title: "Test Task",
	description: "Test description",
	completed: false,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("TaskService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("lists tasks ordered by creation date", async () => {
		(mockPrisma.task.findMany as any).mockResolvedValue([task]);

		const result = await taskService.findAll();

		expect(result).toEqual([task]);
		expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
			orderBy: { createdAt: "desc" },
		});
	});

	it("finds a task by id", async () => {
		(mockPrisma.task.findUnique as any).mockResolvedValue(task);

		const result = await taskService.findById(1);

		expect(result).toEqual(task);
		expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
	});

	it("creates a task", async () => {
		(mockPrisma.task.create as any).mockResolvedValue(task);

		const result = await taskService.create({
			title: "Test Task",
			description: "Test description",
		});

		expect(result).toEqual(task);
		expect(mockPrisma.task.create).toHaveBeenCalledWith({
			data: { title: "Test Task", description: "Test description" },
		});
	});

	it("updates an existing task", async () => {
		const updatedTask = { ...task, completed: true };
		(mockPrisma.task.findUnique as any).mockResolvedValue(task);
		(mockPrisma.task.update as any).mockResolvedValue(updatedTask);

		const result = await taskService.update(1, { completed: true });

		expect(result).toEqual(updatedTask);
		expect(mockPrisma.task.update).toHaveBeenCalledWith({
			where: { id: 1 },
			data: { completed: true },
		});
	});

	it("throws when updating a missing task", async () => {
		(mockPrisma.task.findUnique as any).mockResolvedValue(null);

		await expect(taskService.update(99, { completed: true })).rejects.toThrow(
			"Task not found"
		);
	});

	it("deletes an existing task", async () => {
		(mockPrisma.task.findUnique as any).mockResolvedValue(task);
		(mockPrisma.task.delete as any).mockResolvedValue(task);

		const result = await taskService.remove(1);

		expect(result).toEqual(task);
		expect(mockPrisma.task.delete).toHaveBeenCalledWith({ where: { id: 1 } });
	});

	it("throws when deleting a missing task", async () => {
		(mockPrisma.task.findUnique as any).mockResolvedValue(null);

		await expect(taskService.remove(99)).rejects.toThrow("Task not found");
	});
});
