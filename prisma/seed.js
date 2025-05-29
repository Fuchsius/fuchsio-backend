const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🌱 Starting database seeding...");
    console.log("📡 Connecting to database...");

    // Test database connection
    await prisma.$connect();
    console.log("✅ Database connected successfully!");

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      console.log("⚠️  Admin user already exists. Skipping seed.");
      return;
    }

    console.log("👤 Creating admin user...");
    // Create admin user
    const hashedPassword = await bcrypt.hash("Admin@123", 12);

    const admin = await prisma.user.create({
      data: {
        email: "admin@fuchsio.com",
        username: "admin",
        password: hashedPassword,
        firstName: "System",
        lastName: "Administrator",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    console.log("✅ Admin user created:", {
      id: admin.id,
      email: admin.email,
      username: admin.username,
      role: admin.role,
    });

    console.log("👤 Creating team lead user...");
    // Create a team lead user
    const teamLeadPassword = await bcrypt.hash("TeamLead@123", 12);

    const teamLead = await prisma.user.create({
      data: {
        email: "teamlead@fuchsio.com",
        username: "teamlead",
        password: teamLeadPassword,
        firstName: "Team",
        lastName: "Leader",
        role: "TEAM_LEAD",
        status: "ACTIVE",
        createdBy: admin.id,
      },
    });

    console.log("✅ Team Lead user created:", {
      id: teamLead.id,
      email: teamLead.email,
      username: teamLead.username,
      role: teamLead.role,
    });

    console.log("👤 Creating employee user...");
    // Create an employee user
    const employeePassword = await bcrypt.hash("Employee@123", 12);

    const employee = await prisma.user.create({
      data: {
        email: "employee@fuchsio.com",
        username: "employee",
        password: employeePassword,
        firstName: "John",
        lastName: "Employee",
        role: "EMPLOYEE",
        status: "ACTIVE",
        createdBy: teamLead.id,
      },
    });

    console.log("✅ Employee user created:", {
      id: employee.id,
      email: employee.email,
      username: employee.username,
      role: employee.role,
    });

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📋 Default Users Created:");
    console.log("┌─────────────────────────────────────────────────────────┐");
    console.log(
      "│ Role      │ Email                │ Username  │ Password   │"
    );
    console.log("├─────────────────────────────────────────────────────────┤");
    console.log(
      "│ ADMIN     │ admin@fuchsio.com    │ admin     │ Admin@123  │"
    );
    console.log(
      "│ TEAM_LEAD │ teamlead@fuchsio.com │ teamlead  │ TeamLead@123│"
    );
    console.log(
      "│ EMPLOYEE  │ employee@fuchsio.com │ employee  │ Employee@123│"
    );
    console.log("└─────────────────────────────────────────────────────────┘");
    console.log("\n⚠️  Remember to change default passwords in production!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
