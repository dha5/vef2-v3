import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { z } from "zod";
import xss from "xss";
import slugify from "slugify";

const categories = new Hono();
const prisma = new PrismaClient();

//sækja alla flokka
categories.get("/", async (c) => {
    try {
        const categories = await prisma.category.findMany({ include: { questions: true }});
        return c.json(categories, 200);
    } catch (error) {
        return c.json({ error: "Internal Server Error" }, 500);
    }
});

//sækja stakan flokk
categories.get("/:slug", async (c) => {
    try {
        const { slug } = c.req.param();
        const category = await prisma.category.findUnique({ where: { slug }, include: { questions: true } });

        return category ? c.json(category, 200) : c.json({ error: "Category not found" }, 404);
    } catch (error) {
        return c.json({ error: "Internal Server Error" }, 500);
    }
});

//búa til nýjan flokk
categories.post("/", async (c) => {
    const body = await c.req.json();
    const schema = z.object({ name: z.string().min(3) });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: "Invalid data" }, 400);
    }

    try {
        const slug = slugify(body.name, { lower: true });
        const newCategory = await prisma.category.create({
            data: { name: xss(body.name), slug },
        });
        return c.json(newCategory, 201);
    } catch (error) {
        return c.json({ error: "Internal Server Error" }, 500);
    }
});

//uppfæra flokk
categories.patch("/:slug", async (c) => {
    try {
        const { slug } = c.req.param();
        const body = await c.req.json();

        if (body.name && body.name.length < 3) {
            return c.json({ error: "Invalid data" }, 400);
        }

        const updatedCategory = await prisma.category.update({
            where: { slug },
            data: { name: body.name ? xss(body.name) : undefined },
        });

        return c.json(updatedCategory);
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === "P2025") {
            return c.json({ error: "Category not found" }, 404);
        }
        return c.json({ error: "Internal Server Error" }, 500);
    }
});

//eyða flokk
categories.delete("/:slug", async (c) => {
    const { slug } = c.req.param();
    try {
        await prisma.category.delete({ where: { slug }});
        return c.newResponse(null, { status: 204 });
    } catch (error) {
        return c.json({ error: "Category not found" }, 404);
    }
});

export default categories;