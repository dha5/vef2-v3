import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import xss from "xss";

const answers = new Hono();
const prisma = new PrismaClient();

//sækja svör
answers.get("/question/:questionId", async (c) => {
    try {
        const { questionId } = c.req.param();
        const question = await prisma.question.findUnique({
            where: { id: questionId },
            include: { answers: true },
        });

        return question ? c.json(question.answers, 200) : c.json({ error: "Question not found"}, 404);
    } catch (error) {
        console.error("Error in route:", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
});

//búa til spurningu
answers.post("/", async (c) => {
    const body = await c.req.json();
    const schema = z.object({
        content: z.string().min(1),
        questionId: z.string().uuid(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: "Invalid data" }, 400);
    }

    try {
        const question = await prisma.question.findUnique({ where: {id: body.questionId } });
        if (!question) return c.json({ error: "Question not found" }, 400);

        const newAnswer = await prisma.answer.create({
            data: {
                content: xss(body.content),
                questionId: body.questionId,
            },
        });

        return c.json(newAnswer, 201);
    } catch (error) {
        console.error("Error in route:", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
});

//uppfæra svar
answers.patch("/:id", async (c) => {
    try {
        const { id } = c.req.param();
        const body = await c.req.json();
        const schema = z.object({
            content: z.string().min(1),
        });

        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return c.json({ error: "Invalid data" }, 400);
        }

        const updatedAnswer = await prisma.answer.update({
            where: { id },
            data: { content: xss(body.content) },
        });

        return c.json(updatedAnswer);
    } catch (error) {
        console.error("Error in route:", error);
        return c.json({ error: "Answer not found" }, 404);
    }
});

//eyða svari
answers.delete("/:id", async (c) => {
    const { id } = c.req.param();
    try {
        const answer = await prisma.answer.findUnique({ where: { id } });
        if (!answer) return c.json({ error: "Answer not found" }, 404);

        await prisma.answer.delete({ where: { id } });
        return c.newResponse(null, { status: 204 });
    } catch (error) {
        console.error("Error in route:", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
})

export default answers;