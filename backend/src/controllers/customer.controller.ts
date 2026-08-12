import { Response } from "express";
import prisma from "../config/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
  followUpSchema,
} from "../validators/customer.validator.js";

export const createCustomer = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const validation = createCustomerSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
      return;
    }

    const data = validation.data;

    const customer = await prisma.customer.create({
      data: {
        customerName: data.customerName,
        mobile: data.mobile,
        email: data.email || null,
        businessName: data.businessName,
        gstNumber: data.gstNumber || null,
        customerType: data.customerType,
        address: data.address,
        status: data.status ?? "LEAD",
        followUpDate: data.followUpDate
          ? new Date(data.followUpDate)
          : null,
        notes: data.notes || null,
        createdById: req.user.userId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create customer",
    });
  }
};

export const getCustomers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100
    );

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const status =
      typeof req.query.status === "string"
        ? req.query.status
        : undefined;

    const customerType =
      typeof req.query.customerType === "string"
        ? req.query.customerType
        : undefined;

    const where = {
      ...(search
        ? {
            OR: [
              {
                customerName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                businessName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                mobile: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),

      ...(status ? { status: status as any } : {}),

      ...(customerType
        ? { customerType: customerType as any }
        : {}),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),

      prisma.customer.count({
        where,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get customers error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
    });
  }
};

export const getCustomerById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        followUps: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        challans: {
          select: {
            id: true,
            challanNumber: true,
            totalQuantity: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Customer not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Get customer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
    });
  }
};

export const updateCustomer = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
      return;
    }

    const validation = updateCustomerSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
      return;
    }

    const data = validation.data;

    const existingCustomer =
      await prisma.customer.findUnique({
        where: { id },
      });

    if (!existingCustomer) {
      res.status(404).json({
        success: false,
        message: "Customer not found",
      });
      return;
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(data.customerName !== undefined && {
          customerName: data.customerName,
        }),

        ...(data.mobile !== undefined && {
          mobile: data.mobile,
        }),

        ...(data.email !== undefined && {
          email: data.email || null,
        }),

        ...(data.businessName !== undefined && {
          businessName: data.businessName,
        }),

        ...(data.gstNumber !== undefined && {
          gstNumber: data.gstNumber || null,
        }),

        ...(data.customerType !== undefined && {
          customerType: data.customerType,
        }),

        ...(data.address !== undefined && {
          address: data.address,
        }),

        ...(data.status !== undefined && {
          status: data.status,
        }),

        ...(data.followUpDate !== undefined && {
          followUpDate: data.followUpDate
            ? new Date(data.followUpDate)
            : null,
        }),

        ...(data.notes !== undefined && {
          notes: data.notes || null,
        }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update customer",
    });
  }
};

export const deleteCustomer = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        challans: {
          select: { id: true },
        },
      },
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Customer not found",
      });
      return;
    }

    if (customer.challans.length > 0) {
      res.status(409).json({
        success: false,
        message:
          "Customer cannot be deleted because challans exist for this customer",
      });
      return;
    }

    await prisma.customer.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete customer",
    });
  }
};

export const addFollowUp = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
      return;
    }

    const validation = followUpSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Customer not found",
      });
      return;
    }

    const followUp = await prisma.followUp.create({
      data: {
        customerId,
        note: validation.data.note,
        followUpDate: validation.data.followUpDate
          ? new Date(validation.data.followUpDate)
          : null,
        createdById: req.user.userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Follow-up added successfully",
      data: followUp,
    });
  } catch (error) {
    console.error("Add follow-up error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add follow-up",
    });
  }
};

export const getFollowUps = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Customer not found",
      });
      return;
    }

    const followUps = await prisma.followUp.findMany({
      where: {
        customerId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: followUps,
    });
  } catch (error) {
    console.error("Get follow-ups error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch follow-ups",
    });
  }
};