import { MedusaService, InjectManager, MedusaContext,} from "@medusajs/framework/utils"
import ChefEventModel from "./models/chef-event"

class ChefEventModuleService extends MedusaService({
  ChefEvent: ChefEventModel
}){    
}

export default ChefEventModuleService