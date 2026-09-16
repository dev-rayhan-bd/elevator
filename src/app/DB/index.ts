import config from "../config";
import { Admin } from "../modules/Admin/admin.model";
import { USER_ROLE } from "../modules/Auth/auth.constant";
import { TUser } from "../modules/User/user.interface";
import { User } from "../modules/User/user.model";


import { ServiceArea } from "../modules/ServiceArea/serviceArea.model";

const seedAdmin = async () => {

  const superUser: Partial<TUser> = {
    firstName: config.super_admin_first_name as string,
    lastName: config.super_admin_last_name as string,
    fullName: `${config.super_admin_first_name} ${config.super_admin_last_name}`,
    email: config.super_admin_email as string,
     phone: "+920000000000",
    password: config.super_admin_password as string,
    role: USER_ROLE.superAdmin,
    status: 'active', 
    isOtpVerified: true,
  };

  try {

    const isSuperAdminExits = await Admin.findOne({ role: USER_ROLE.superAdmin });

    if (!isSuperAdminExits) {
      await Admin.create(superUser);
      console.log("✅ Super Admin seeded successfully!");
    } else {
      console.log("ℹ️ Super Admin already exists. Skipping seed.");
    }

    // Seed "All Karachi" ServiceArea if missing
    const isAllKarachiExists = await ServiceArea.findOne({ name: 'All Karachi' });
    if (!isAllKarachiExists) {
      await ServiceArea.create({
        name: 'All Karachi',
        region: 'Karachi',
        isActive: true,
      });
      console.log('✅ "All Karachi" ServiceArea seeded successfully!');
    }
  } catch (error) {
    console.error("❌ Error seeding Admin/Data:", error);
  }
};

export default seedAdmin;