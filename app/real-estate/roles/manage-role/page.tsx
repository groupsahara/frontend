import dynamic from 'next/dynamic'

const RolesPermissionsPanel = dynamic(() => import('./components/RolesPermissionsPanel'))

export default function ManageRolePage() {
  return <RolesPermissionsPanel />
}
