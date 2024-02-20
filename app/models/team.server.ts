import type { Permission, Team, User } from "@prisma/client";
import { prisma } from "~/lib/db.server";

// Predefined permissions for roles
const adminPermissions = [
  // Full access to all entities - projects, users, etc.
  { action: "create", entity: "project", access: "any" },
  { action: "read", entity: "project", access: "any" },
  { action: "update", entity: "project", access: "any" },
  { action: "delete", entity: "project", access: "any" },
  { action: "create", entity: "user", access: "any" },
  { action: "read", entity: "user", access: "any" },
  { action: "update", entity: "user", access: "any" },
  { action: "delete", entity: "user", access: "any" },
]; // List of permission IDs or details

const memberPermissions = [
  { action: "create", entity: "project", access: "any" },
  { action: "read", entity: "project", access: "any" },
  { action: "update", entity: "project", access: "any" },
];

export async function createTeamWithDefaultRoles(
  userId: User["id"],
  { name, description }: Pick<Team, "name" | "description">
) {
  // Wrap operations in a transaction
  return await prisma.$transaction(async (prisma) => {
    // Create the new team
    const team = await prisma.team.create({
      data: {
        name,
        description,
      },
    });

    // Find or create the predefined permissions
    // Defined within the Prisma transaction
    async function findOrCreatePermissions(
      permissions: Pick<Permission, "action" | "entity" | "access">[]
    ) {
      // This function should check if each permission exists and create it if not.
      // Then return an array of the permission IDs that can be used to connect the permissions to the roles.
      const permissionIds = [];
      for (const permission of permissions) {
        let dbPermission = await prisma.permission.findUnique({
          where: {
            action_entity_access: {
              action: permission.action,
              entity: permission.entity,
              access: permission.access,
            },
          },
        });

        if (!dbPermission) {
          dbPermission = await prisma.permission.create({
            data: permission,
          });
        }

        permissionIds.push({ id: dbPermission.id });
      }
      return permissionIds;
    }

    const adminPermissionIds = await findOrCreatePermissions(adminPermissions);
    const memberPermissionIds = await findOrCreatePermissions(
      memberPermissions
    );

    // Create "Admin" role with permissions for the new team
    const adminRole = await prisma.role.create({
      data: {
        name: "Admin",
        teamId: team.id,
        permissions: {
          connect: adminPermissionIds, // List of permission IDs
        },
      },
    });

    // Create "Member" role with permissions for the new team
    const memberRole = await prisma.role.create({
      data: {
        name: "Member",
        teamId: team.id,
        permissions: {
          connect: memberPermissionIds, // List of permission IDs
        },
      },
    });

    // Finally, connect the user to the new team as an admin
    await prisma.teamMembership.create({
      data: {
        teamId: team.id,
        userId,
        roleId: adminRole.id,
      },
    });

    // Return the new team and roles
    return { team, roles: [adminRole, memberRole] };
  });
}
