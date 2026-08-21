import { Response } from "express";
import prisma from "../config/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export const getLocations = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: {
        name: "asc",
      },
    });

    res.status(200).json({
      success: true,
      data: locations,
    });
  } catch (error) {
    console.error("Get locations error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch locations",
    });
  }
};

export const getLocationById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid location ID",
      });
      return;
    }

    const location = await prisma.location.findUnique({
      where: {
        id,
      },
      include: {
        inventory: {
          include: {
            product: true,
          },
          orderBy: {
            product: {
              name: "asc",
            },
          },
        },
      },
    });

    if (!location) {
      res.status(404).json({
        success: false,
        message: "Location not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: location,
    });
  } catch (error) {
    console.error("Get location error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch location",
    });
  }
};

export const createLocation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      res.status(400).json({
        success: false,
        message: "Location name and code are required",
      });
      return;
    }

    const normalizedName = String(name).trim();
    const normalizedCode = String(code).trim().toUpperCase();

    if (!normalizedName || !normalizedCode) {
      res.status(400).json({
        success: false,
        message: "Location name and code cannot be empty",
      });
      return;
    }

    const existingLocation = await prisma.location.findUnique({
      where: {
        code: normalizedCode,
      },
    });

    if (existingLocation) {
      res.status(409).json({
        success: false,
        message: "Location code already exists",
      });
      return;
    }

    const location = await prisma.location.create({
      data: {
        name: normalizedName,
        code: normalizedCode,
      },
    });

    res.status(201).json({
      success: true,
      message: "Location created successfully",
      data: location,
    });
  } catch (error) {
    console.error("Create location error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create location",
    });
  }
};

export const updateLocation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid location ID",
      });
      return;
    }

    const { name, code } = req.body;

    const existingLocation = await prisma.location.findUnique({
      where: {
        id,
      },
    });

    if (!existingLocation) {
      res.status(404).json({
        success: false,
        message: "Location not found",
      });
      return;
    }

    const data: {
      name?: string;
      code?: string;
    } = {};

    if (name !== undefined) {
      const normalizedName = String(name).trim();

      if (!normalizedName) {
        res.status(400).json({
          success: false,
          message: "Location name cannot be empty",
        });
        return;
      }

      data.name = normalizedName;
    }

    if (code !== undefined) {
      const normalizedCode = String(code).trim().toUpperCase();

      if (!normalizedCode) {
        res.status(400).json({
          success: false,
          message: "Location code cannot be empty",
        });
        return;
      }

      const duplicate = await prisma.location.findFirst({
        where: {
          code: normalizedCode,
          NOT: {
            id,
          },
        },
      });

      if (duplicate) {
        res.status(409).json({
          success: false,
          message: "Location code already exists",
        });
        return;
      }

      data.code = normalizedCode;
    }

    const location = await prisma.location.update({
      where: {
        id,
      },
      data,
    });

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: location,
    });
  } catch (error) {
    console.error("Update location error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update location",
    });
  }
};