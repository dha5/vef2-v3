import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import xss from "xss";

const questions = new Hono();
const prisma = new PrismaClient();

//sækja allar spurningar
questions.get("/", async (c) => {
    try {
        const allQuestions = await prisma.question.findMany({ include: { category: true } });
        return c.json(allQuestions, 200);
    } catch (error) {
        console.error("Error in route:", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
});

//sækja staka spurningu
questions.get("/:id", async (c) => {
    try {
        const { id } = c.req.param();
        const question = await prisma.question.findUnique({ where: { id }, include: { category: true } });

        return question ? c.json(question, 200) : c.json({ error: "Question not found" }, 404);
    } catch (error) {
        console.error("Error in route:", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
});

//sækja spurningar eftir flokk
questions.get("/category/:slug", async (c) => {
    try {
        const { slug } = c.req.param();
        const category = await prisma.category.findUnique({ where: { slug }, include: { questions: true } });

        return category ? c.json(category.questions, 200) : c.json({ error: "Category not found" }, 404);
    } catch (error) {
        console.error("Error in route:", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
});

//búa til nýja spurningu
questions.post("/", async (c) => {
    const body = await c.req.json();
    const schema = z.object({
        content: z.string().min(5),
        categoryId: z.string().uuid(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: "Invalid data" }, 400);
    }

    try {
        const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
        if (!category) return c.json({ error: "Category not found" }, 400);
        
        const newQuestion = await prisma.question.create({
            data: {
                content: xss(body.content),
                categoryId: body.categoryId,
            },
        });
        return c.json(newQuestion, 201);
    } catch (error) {
        console.error("Error in route:", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
});

// Uppfæra spurningu
questions.patch("/:id", async (c) => {
    try {
        const { id } = c.req.param();
        const body = await c.req.json();

        if (body.content && body.content.length < 5) {
            return c.json({ error: "Invalid data" }, 400);
        }

        const updatedQuestion = await prisma.question.update({
            where: { id },
            data: { content: body.content ? xss(body.content) : undefined },
        });

        return c.json(updatedQuestion);
    } catch (error) {
        console.error("Error in route:", error);
        return c.json({ error: "Question not found" }, 404);
    }
});


//eyða spurningu
questions.delete("/:id", async (c) => {
    const { id } = c.req.param();
    try {
        const question = await prisma.question.findUnique({ where: { id } });
        if (!question) return c.json({ error: "Question not found" }, 404);

        await prisma.question.delete({ where: { id } });
        return c.newResponse(null, { status: 204 });
    } catch (error) {
        console.error("Error in route:", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
});

export default questions;