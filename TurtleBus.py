import turtle as tt
import random, math, time
import bustracker as btr

class BusBall(tt.Turtle): 
    def __init__(self, size, x_init, y_init, busid): 
        tt.Turtle.__init__(self) 
        self.ht()
        self.speed(0)
        self.busid = busid
        self.shape('square')
        self.color(random.randint(10, 200),random.randint(10, 200),random.randint(10, 200))
        #self.color(random.choice(['red', 'orange','yellow','green','blue','purple']))
        self.shapesize(size)
        self.penup()
        self.goto(x_init, y_init)
        self.showturtle()
        self.pendown()
        self.xcoord = x_init
        self.ycoord = y_init

    def move(self, x_new, y_new):
        self.xcoord = x_new
        self.ycoord = y_new
        self.goto(x_new, y_new)
        


def main():
    tt.TurtleScreen._RUNNING = True
    n_steps =10
    step_time_delay = 5
    s = tt.Screen() 
    s.clear()
    s.setup(width=700, height=700, starty = 0)
    s.setworldcoordinates(-14000, -14000, 14000, 14000)
    s.tracer(60, 0)  #FIRST ARGUMENT DETERMINES SPEED OF ANIMATION
    s.colormode(255)
    fleet = [x for x in btr.getAllVehiclesGTFS() if x['type'] == 'bus']
    buses = dict([(b['id'], BusBall(.2, b['xcoord'], b['ycoord'], b['id'])) for b in fleet])
    # creates a dictionary of just the buses of the form { id : BusBall}
    s.tracer(False)
    for i in range(n_steps):
        s.update()
        time.sleep(step_time_delay)
        fleet = [x for x in btr.getAllVehiclesGTFS() if x['type'] == 'bus']
        print 'step', i + 1, 'of', n_steps, 'current fleet size:', len(fleet)
        for b in fleet: #for each bus in the retrieved fleet, 
            if b['id'] in buses:  #see whether it is in the current list of buses
                if buses[b['id']].ycoord != b['ycoord']: #if yes, see whether it has a new position
                    buses[b['id']].move(b['xcoord'], b['ycoord']) #if yes, move it
            else:
                buses[b['id']] = BusBall(.2, b['xcoord'], b['ycoord'], b['id']) #add it to the current bus list
                print 'NEW BUS!!!', b['id']
        

          


if __name__ == "__main__": 
    main()
    tt.mainloop() 
